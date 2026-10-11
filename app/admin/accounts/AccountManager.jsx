"use client";

import {
  createMoneyAccount,
  deleteMoneyAccount,
  recordMoneyMovement,
  updateMoneyAccount,
} from "@/backend/serverActions/moneyAccountAction";
import { recordProviderFee } from "@/backend/serverActions/paymentAction";
import Modal from "@/components/modal/Modal";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const TYPES = [
  "CASH",
  "BANK",
  "MOBILE_FINANCIAL",
  "PAYMENT_GATEWAY",
  "COURIER",
];
const MOVEMENTS = ["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL"];
const TRANSACTION_TYPES = [...MOVEMENTS, "SUPPLIER_PAYMENT", "EXPENSE"];
const field =
  "w-full rounded-brand border border-border bg-surface px-3 py-2 text-text outline-none focus:border-primary";
const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(value || 0);

function Dialog({ open, close, title, action, successRedirect, children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await action(new FormData(form));
      if (result.success) {
        toast.success(result.message);
        close();
        form.reset();
        if (successRedirect) router.push(successRedirect);
        else router.refresh();
      } else toast.error(result.message);
    });
  };
  return (
    <Modal isOpen={open} onClose={close}>
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
        <button disabled={pending} className="button w-full">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}
const Label = ({ children }) => (
  <label className="grid gap-1 text-sm font-semibold">{children}</label>
);

export default function AccountManager({ result }) {
  const requestedReturnTo = result.success ? result.filters?.returnTo : null;
  const accountCreatedRedirect = [
    "/admin/settings/payment-gateways?add=1",
    "/admin/settings/couriers?add=1",
  ].includes(requestedReturnTo)
    ? requestedReturnTo
    : null;
  const [dialog, setDialog] = useState(
    result.success && result.filters?.createAccount === "1" ? "account" : null,
  );
  const [editingAccount, setEditingAccount] = useState(null);
  const [movement, setMovement] = useState("FUND_ADD");
  const [deleting, startDelete] = useTransition();
  const router = useRouter();
  if (!result.success) return <div className="card">{result.message}</div>;
  const { accounts, allAccounts, transactions, shareholders, report, pagination } =
    result.data;
  const filters = result.filters || {};
  const hasFilters = [
    "accountName",
    "accountType",
    "accountStatus",
    "transactionNo",
    "reference",
    "transactionType",
  ].some((key) => filters[key] && filters[key] !== "ALL");
  const filterHref = (key, value) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(
      ([name, current]) =>
        current && current !== "ALL" && query.set(name, current),
    );
    if (value && value !== "ALL" && filters[key] !== value)
      query.set(key, value);
    else query.delete(key);
    const text = query.toString();
    return text ? `/admin/accounts?${text}` : "/admin/accounts";
  };
  const removeAccount = (account) => {
    if (
      !window.confirm(
        `Delete ${account.name}? Only accounts without transactions can be deleted.`,
      )
    )
      return;
    startDelete(async () => {
      const response = await deleteMoneyAccount(account.id);
      response.success
        ? toast.success(response.message)
        : toast.error(response.message);
      if (response.success) router.refresh();
    });
  };
  return (
    <main className="space-y-5 p-3 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Money Accounts</h1>
          <p className="text-sm text-text-muted">
            Maintain balances across customer payment channels and business
            accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog("account")} className="button">
            <Plus className="h-4 w-4" /> Account
          </button>
          <button onClick={() => setDialog("movement")} className="button">
            <Plus className="h-4 w-4" /> Money movement
          </button>
          <button onClick={() => setDialog("providerFee")} className="button">
            <Plus className="h-4 w-4" /> Provider fee
          </button>
          <Link href="/admin/accounts/shareholders" className="button">
            Shareholders
          </Link>
          <Link href="/admin/accounts/ledger" className="button">
            General ledger
          </Link>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Total assets" value={money(report.assets)} />
        <ReportCard label="Inventory assets" value={money(report.inventoryAsset)} />
        <ReportCard label="Inventory units" value={Number(report.inventoryQuantity || 0).toLocaleString("en-BD")} />
        <ReportCard label="Liquid funds" value={money(report.liquidFunds)} />
        <ReportCard label="Liabilities" value={money(report.liabilities)} />
        <ReportCard label="Equity" value={money(report.equity)} />
        <ReportCard label="Income" value={money(report.income)} />
        <ReportCard label="Expenses" value={money(report.expenses)} />
        <ReportCard label="Net profit" value={money(report.netProfit)} />
        <ReportCard
          label="Supplier payments"
          value={money(report.supplierPayments)}
        />
      </section>
      <section className="rounded-brand border border-border bg-surface p-3">
        <h2 className="mb-2 font-bold">Balances by account type</h2>
        <div className="flex flex-wrap gap-2">
          {report.byType.map((item) => (
            <span
              key={item.type}
              className="rounded-brand bg-surface-muted px-3 py-2 text-sm"
            >
              <strong>{item.type}</strong> · {money(item.balance)}
            </span>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-brand border border-border bg-surface p-3">
        <form className="flex flex-wrap gap-2">
          <input
            type="hidden"
            name="accountType"
            value={filters.accountType || ""}
          />
          <input
            type="hidden"
            name="accountStatus"
            value={filters.accountStatus || ""}
          />
          <input
            className={`${field} max-w-sm`}
            name="accountName"
            defaultValue={filters.accountName || ""}
            placeholder="Account name"
          />
          <button className="button">Search</button>
          {hasFilters && (
            <Link
              href="/admin/accounts"
              className="inline-flex items-center gap-1 rounded-brand border border-border px-3"
            >
              <X className="h-4 w-4" /> Remove filters
            </Link>
          )}
        </form>
        <ChipFilters
          label="Account type"
          values={TYPES}
          active={filters.accountType}
          href={(value) => filterHref("accountType", value)}
        />
        <ChipFilters
          label="Status"
          values={["ACTIVE", "INACTIVE"]}
          active={filters.accountStatus}
          href={(value) => filterHref("accountStatus", value)}
        />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((account) => (
          <article
            key={account.id}
            className="rounded-brand border border-border bg-surface p-4"
          >
            <div className="flex justify-between gap-2">
              <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                {account.type}
              </span>
              <div className="flex items-center gap-2">
                <small
                  className={account.isActive ? "text-success" : "text-danger"}
                >
                  {account.isActive ? "ACTIVE" : "INACTIVE"}
                </small>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(account);
                    setDialog("editAccount");
                  }}
                  aria-label={`Edit ${account.name}`}
                  className="rounded p-1 text-primary hover:bg-primary-soft"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  disabled={deleting || Object.values(account._count || {}).some(Boolean)}
                  type="button"
                  onClick={() => removeAccount(account)}
                  aria-label={`Delete ${account.name}`}
                  title={Object.values(account._count || {}).some(Boolean) ? "Account is mapped or has financial documents" : "Delete"}
                  className="rounded p-1 text-danger hover:bg-danger/10 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h2 className="mt-3 font-bold">{account.name}</h2>
            <p className="text-sm text-text-muted">
              {account.accountNumber || "No account number"}
            </p>
            <strong className="mt-3 block text-xl">
              {money(account.balance)}
            </strong>
          </article>
        ))}
      </section>
      <ListPagination
        pagination={pagination.accounts}
        pageKey="accountPage"
        filters={filters}
      />
      {!accounts.length && (
        <div className="card text-center text-text-muted">
          No matching money accounts.
        </div>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Money transactions</h2>
        <div className="space-y-3 rounded-brand border border-border bg-surface p-3">
          <form className="grid gap-2 sm:grid-cols-3">
            <input
              type="hidden"
              name="transactionType"
              value={filters.transactionType || ""}
            />
            <input
              className={field}
              name="transactionNo"
              defaultValue={filters.transactionNo || ""}
              placeholder="Transaction number"
            />
            <input
              className={field}
              name="reference"
              defaultValue={filters.reference || ""}
              placeholder="Reference"
            />
            <button className="button">Search transactions</button>
          </form>
          <ChipFilters
            label="Transaction type"
            values={TRANSACTION_TYPES}
            active={filters.transactionType}
            href={(value) => filterHref("transactionType", value)}
          />
        </div>
        <div className="responsive-table rounded-brand border border-border bg-surface">
          <table className="min-w-[850px] text-left text-sm">
            <thead className="bg-surface-muted">
              <tr>
                {[
                  "Date",
                  "Transaction",
                  "Type",
                  "From",
                  "To",
                  "Shareholder",
                  "Reference",
                  "Amount",
                ].map((head) => (
                  <th className="p-3" key={head}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((item) => (
                <tr className="border-t border-border" key={item.id}>
                  <td className="p-3">
                    {new Date(item.transactionDate).toLocaleDateString("en-BD")}
                  </td>
                  <td className="p-3 font-semibold">{item.transactionNo}</td>
                  <td className="p-3">{item.type.replaceAll("_", " ")}</td>
                  <td className="p-3">
                    {item.fromAccount?.name || "External"}
                  </td>
                  <td className="p-3">{item.toAccount?.name || "External"}</td>
                  <td className="p-3">{item.shareholder?.name || "—"}</td>
                  <td className="p-3">{item.reference || "—"}</td>
                  <td className="p-3 font-semibold">{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ListPagination
        pagination={pagination.transactions}
        pageKey="transactionPage"
        filters={filters}
      />
      <section className="space-y-2">
        <h2 className="text-xl font-bold">Shareholders</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shareholders.map((person) => (
            <article className="card" key={person.id}>
              <strong>{person.name}</strong>
              <p className="text-sm text-text-muted">
                {person.phone || person.email || "No contact details"}
              </p>
              <p className="mt-2 text-sm">
                Share:{" "}
                {person.sharePercentage == null
                  ? "Not set"
                  : `${person.sharePercentage}%`}
              </p>
            </article>
          ))}
        </div>
      </section>
      <Dialog
        open={dialog === "account"}
        close={() => setDialog(null)}
        title="Create money account"
        action={createMoneyAccount}
        successRedirect={accountCreatedRedirect}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Name
            <input required name="name" className={field} />
          </Label>
          <Label>
            Type
            <select required name="type" className={field}>
              {TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Label>
          <Label>
            Account number
            <input name="accountNumber" className={field} />
          </Label>
        </div>
      </Dialog>
      <Dialog
        open={dialog === "editAccount"}
        close={() => {
          setDialog(null);
          setEditingAccount(null);
        }}
        title="Edit money account"
        action={(formData) => updateMoneyAccount(editingAccount.id, formData)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>Name<input required name="name" defaultValue={editingAccount?.name || ""} className={field} /></Label>
          <Label>Type<select required name="type" defaultValue={editingAccount?.type || "CASH"} className={field}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></Label>
          <Label>Account number<input name="accountNumber" defaultValue={editingAccount?.accountNumber || ""} className={field} /></Label>
          <Label>Status<select name="isActive" defaultValue={String(editingAccount?.isActive ?? true)} className={field}><option value="true">Active</option><option value="false">Inactive</option></select></Label>
        </div>
      </Dialog>
      <Dialog
        open={dialog === "providerFee"}
        close={() => setDialog(null)}
        title="Record gateway / courier fee"
        action={recordProviderFee}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>Provider account<select required name="moneyAccountId" className={field}><option value="">Select account</option>{allAccounts.filter((account) => account.isActive).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type} · {money(account.balance)}</option>)}</select></Label>
          <Label>Provider name<input name="providerName" className={field} /></Label>
          <Label>Fee amount<input required name="amount" type="number" min="0.01" step="0.01" className={field} /></Label>
          <Label>Fee date<input required name="feeDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={field} /></Label>
          <Label>Reference<input name="reference" className={field} /></Label>
        </div>
      </Dialog>
      <Dialog
        open={dialog === "movement"}
        close={() => setDialog(null)}
        title="Record money movement"
        action={recordMoneyMovement}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Type
            <select
              required
              name="type"
              value={movement}
              onChange={(event) => setMovement(event.target.value)}
              className={field}
            >
              {MOVEMENTS.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Amount
            <input
              required
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              className={field}
            />
          </Label>
          {["TRANSFER", "WITHDRAWAL"].includes(movement) && (
            <Label>
              From account
              <select required name="fromAccountId" className={field}>
                <option value="">Select account</option>
                {allAccounts
                  .filter((a) => a.isActive)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {money(a.balance)}
                    </option>
                  ))}
              </select>
            </Label>
          )}
          {["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER"].includes(movement) && (
            <Label>
              To account
              <select required name="toAccountId" className={field}>
                <option value="">Select account</option>
                {allAccounts
                  .filter((a) => a.isActive)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Label>
          )}
          {["FUND_ADD", "WITHDRAWAL"].includes(movement) && (
            <Label>
              {movement === "WITHDRAWAL"
                ? "Withdrawn by"
                : "Shareholder (optional)"}
              <select
                required={movement === "WITHDRAWAL"}
                name="shareholderId"
                className={field}
              >
                <option value="">
                  {movement === "WITHDRAWAL"
                    ? "Select shareholder"
                    : "Business / other source"}
                </option>
                {shareholders.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </Label>
          )}
          <Label>
            Date
            <input
              required
              name="transactionDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={field}
            />
          </Label>
          <Label>
            Reference
            <input name="reference" className={field} />
          </Label>
          <Label>
            Note
            <textarea name="note" className={field} />
          </Label>
        </div>
      </Dialog>
    </main>
  );
}

function ChipFilters({ label, values, active, href }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">{label}:</span>
      <Link
        href={href("ALL")}
        className={`rounded-full px-3 py-1 text-xs font-bold ${!active || active === "ALL" ? "bg-primary text-white" : "bg-surface-muted"}`}
      >
        ALL
      </Link>
      {values.map((value) => (
        <Link
          key={value}
          href={href(value)}
          className={`rounded-full px-3 py-1 text-xs font-bold ${active === value ? "bg-primary text-white" : "bg-surface-muted hover:bg-primary-soft"}`}
        >
          {value.replaceAll("_", " ")}
        </Link>
      ))}
    </div>
  );
}
function ReportCard({ label, value }) {
  return (
    <article className="rounded-brand border border-border bg-surface p-4">
      <p className="text-sm text-text-muted">{label}</p>
      <strong className="mt-2 block text-xl">{value}</strong>
    </article>
  );
}
function ListPagination({ pagination, pageKey, filters }) {
  if (pagination.totalPages <= 1) return null;
  const href = (page) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(
      ([key, value]) =>
        value &&
        !["accountPage", "transactionPage"].includes(key) &&
        query.set(key, value),
    );
    query.set(pageKey, page);
    return `/admin/accounts?${query}`;
  };
  return (
    <div className="flex items-center justify-between rounded-brand border border-border bg-surface p-3 text-sm">
      <span>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
        items
      </span>
      <div className="flex gap-2">
        <Link
          className={
            pagination.page <= 1 ? "pointer-events-none opacity-40" : "button"
          }
          href={href(Math.max(1, pagination.page - 1))}
        >
          Previous
        </Link>
        <Link
          className={
            pagination.page >= pagination.totalPages
              ? "pointer-events-none opacity-40"
              : "button"
          }
          href={href(Math.min(pagination.totalPages, pagination.page + 1))}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
