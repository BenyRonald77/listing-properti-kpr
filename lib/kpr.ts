// Simulasi KPR: periode fixed lalu floating, rumus angsuran PMT.

export type KprInput = {
  price: number;
  downPayment: number;
  fixedYears: number;
  fixedAnnualRate: number;
  floatingAnnualRate: number;
  totalYears: number;
};

export type KprYearRow = {
  tahun: number;
  angsuranPerBulan: number;
  totalPokok: number;
  totalBunga: number;
  sisaPokok: number;
};

export type KprResult = {
  pokokPinjaman: number;
  angsuranFixed: number;
  angsuranFloating: number;
  totalBunga: number;
  totalBayar: number;
  jadwalTahunan: KprYearRow[];
};

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);

export function validateKprInput(body: unknown):
  | { ok: true; data: KprInput }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "body harus berupa objek JSON" };
  const b = body as Record<string, unknown>;
  const { price, downPayment, fixedYears, fixedAnnualRate, floatingAnnualRate, totalYears } = b;
  if (!isNum(price) || price <= 0)
    return { ok: false, error: "price harus angka > 0" };
  if (!isNum(downPayment) || downPayment < 0 || downPayment >= (price as number))
    return { ok: false, error: "downPayment harus >= 0 dan < price" };
  if (!isInt(totalYears) || (totalYears as number) < 1 || (totalYears as number) > 35)
    return { ok: false, error: "totalYears harus bilangan bulat 1..35" };
  if (!isInt(fixedYears) || (fixedYears as number) < 0 || (fixedYears as number) > (totalYears as number))
    return { ok: false, error: "fixedYears harus bilangan bulat 0..totalYears" };
  if (!isNum(fixedAnnualRate) || (fixedAnnualRate as number) < 0)
    return { ok: false, error: "fixedAnnualRate harus angka >= 0" };
  if (!isNum(floatingAnnualRate) || (floatingAnnualRate as number) < 0)
    return { ok: false, error: "floatingAnnualRate harus angka >= 0" };
  return {
    ok: true,
    data: {
      price: price as number,
      downPayment: downPayment as number,
      fixedYears: fixedYears as number,
      fixedAnnualRate: fixedAnnualRate as number,
      floatingAnnualRate: floatingAnnualRate as number,
      totalYears: totalYears as number,
    },
  };
}

/** Angsuran bulanan PMT: M = P·r(1+r)^n / ((1+r)^n − 1). */
export function pmt(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  if (annualRatePct === 0) return principal / months;
  const r = annualRatePct / 100 / 12;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function simulateKpr(input: KprInput): KprResult {
  const loan = input.price - input.downPayment;
  const totalMonths = input.totalYears * 12;
  const fixedMonths = input.fixedYears * 12;
  const rFixed = input.fixedAnnualRate / 100 / 12;
  const rFloat = input.floatingAnnualRate / 100 / 12;

  const angsuranFixed = pmt(loan, input.fixedAnnualRate, totalMonths);

  // Fase 1: amortisasi periode fixed -> sisa pokok
  let balance = loan;
  let totalBunga = 0;
  for (let m = 1; m <= fixedMonths; m++) {
    const interest = balance * rFixed;
    const principalPay = Math.min(angsuranFixed - interest, balance);
    balance -= principalPay;
    totalBunga += interest;
    if (balance <= 0) { balance = 0; break; }
  }
  const remainingAfterFixed = balance;

  // Fase 2: hitung ulang angsuran dengan floating rate atas sisa pokok
  const floatMonths = totalMonths - fixedMonths;
  const angsuranFloating = pmt(remainingAfterFixed, input.floatingAnnualRate, floatMonths);

  // Bangun jadwal per bulan lalu agregasi per tahun
  balance = loan;
  const jadwal: KprYearRow[] = [];
  let yearPokok = 0, yearBunga = 0, currentInstallment = angsuranFixed;
  for (let m = 1; m <= totalMonths; m++) {
    const inFixed = m <= fixedMonths;
    const rate = inFixed ? rFixed : rFloat;
    const installment = inFixed ? angsuranFixed : angsuranFloating;
    currentInstallment = installment;
    const interest = balance * rate;
    const principalPay = Math.min(installment - interest, balance);
    balance = Math.max(0, balance - principalPay);
    yearPokok += principalPay;
    yearBunga += interest;
    if (m % 12 === 0 || m === totalMonths) {
      const tahun = Math.ceil(m / 12);
      jadwal.push({
        tahun,
        angsuranPerBulan: round2(currentInstallment),
        totalPokok: round2(yearPokok),
        totalBunga: round2(yearBunga),
        sisaPokok: round2(balance),
      });
      yearPokok = 0; yearBunga = 0;
    }
    if (balance <= 0) break;
  }

  // total bunga & total bayar dari agregasi presisi penuh (hitung ulang cepat)
  let b2 = loan, bungaTotal = 0, angsuranTotal = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const inFixed = m <= fixedMonths;
    const inst = inFixed ? angsuranFixed : angsuranFloating;
    const interest = b2 * (inFixed ? rFixed : rFloat);
    const principalPay = Math.min(inst - interest, b2);
    b2 = Math.max(0, b2 - principalPay);
    bungaTotal += interest;
    angsuranTotal += Math.min(inst, principalPay + interest);
    if (b2 <= 0) break;
  }

  return {
    pokokPinjaman: round2(loan),
    angsuranFixed: round2(angsuranFixed),
    angsuranFloating: round2(angsuranFloating),
    totalBunga: round2(bungaTotal),
    totalBayar: round2(input.downPayment + angsuranTotal),
    jadwalTahunan: jadwal,
  };
}
