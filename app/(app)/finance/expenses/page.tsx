<<<<<<< HEAD
1
import { Suspense } from "react";
import ExpensesClientPage from "./ExpensesClientPage";
=======
// app/(app)/finance/page.tsx
import { Suspense } from "react";
import FinanceClientPage from "./FinanceClientPage";
>>>>>>> adcc011 (Add i18n and language switcher)

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-300">Loading…</div>}>
<<<<<<< HEAD
      <ExpensesClientPage />
=======
      <FinanceClientPage />
>>>>>>> adcc011 (Add i18n and language switcher)
    </Suspense>
  );
}
