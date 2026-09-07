"use client";

import {
  revealProviderCredential,
  saveProviderConfiguration,
} from "@/backend/serverActions/providerConfigurationAction";
import Modal from "@/components/modal/Modal";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Eye, EyeOff, Settings2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const field =
  "w-full rounded-brand border border-border bg-surface px-3 py-2 text-text outline-none focus:border-primary";

const providerCopy = {
  gateway: {
    title: "Payment Gateways",
    singular: "payment gateway",
    path: "/admin/settings/payment-gateways",
  },
  courier: {
    title: "Couriers",
    singular: "courier",
    path: "/admin/settings/couriers",
  },
};

function Pagination({ pagination, path, filters }) {
  if (pagination.totalPages <= 1) return null;
  const href = (page) => {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value && key !== "page") query.set(key, value);
    });
    query.set("page", page);
    return `${path}?${query}`;
  };
  return (
    <nav className="flex items-center justify-between gap-3 text-sm">
      <span>{pagination.total} providers</span>
      <div className="flex gap-2">
        <Link className={`button ${pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={href(pagination.page - 1)}>Previous</Link>
        <span className="rounded-brand border border-border px-3 py-2">{pagination.page} / {pagination.totalPages}</span>
        <Link className={`button ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-40" : ""}`} href={href(pagination.page + 1)}>Next</Link>
      </div>
    </nav>
  );
}

export default function ProviderManager({ kind, result }) {
  const copy = providerCopy[kind];
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(null);
  const [visibleCredentials, setVisibleCredentials] = useState({});
  const [credentialValues, setCredentialValues] = useState({});
  const [revealingCredential, setRevealingCredential] = useState("");
  const [pending, startTransition] = useTransition();
  if (!result.success) {
    return <main className="p-5"><div className="card">{result.message}</div></main>;
  }

  const { providers, adapters, adapterDefinitions, credentialEncryptionReady } = result.data;
  const filters = result.filters || {};
  const canUpdate = hasUIPermission(
    session?.user?.permissions || [],
    "provider",
    "update",
  );
  const selectedDefinition = adapterDefinitions.find(
    (adapter) => adapter.key === editing?.adapterKey,
  );
  const openEditor = (provider) => {
    setVisibleCredentials({});
    setCredentialValues({});
    setRevealingCredential("");
    setEditing(provider);
  };
  const closeEditor = () => {
    setVisibleCredentials({});
    setCredentialValues({});
    setRevealingCredential("");
    setEditing(null);
  };
  const toggleCredentialVisibility = async (credential) => {
    const key = credential.key;
    if (visibleCredentials[key]) {
      setVisibleCredentials((current) => ({ ...current, [key]: false }));
      return;
    }
    if (!credentialValues[key] && editing?.readiness?.hasDatabaseCredentials) {
      setRevealingCredential(key);
      const response = await revealProviderCredential(kind, editing.id, key);
      setRevealingCredential("");
      if (!response.success) {
        toast.error(response.message);
        return;
      }
      setCredentialValues((current) => ({
        ...current,
        [key]: response.data.value,
      }));
    }
    setVisibleCredentials((current) => ({ ...current, [key]: true }));
  };
  const hasFilters = ["name", "code", "adapterKey", "status"].some(
    (key) => filters[key] && filters[key] !== "ALL",
  );
  const chipHref = (key, value) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([name, current]) => {
      if (current && current !== "ALL" && name !== "page") query.set(name, current);
    });
    if (filters[key] === value) query.delete(key);
    else query.set(key, value);
    return query.size ? `${copy.path}?${query}` : copy.path;
  };
  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const response = await saveProviderConfiguration(kind, new FormData(form));
      if (response.success) {
        toast.success(response.message);
        closeEditor();
        router.refresh();
      } else {
        toast.error(response.message);
      }
    });
  };

  return (
    <main className="space-y-5 p-3 sm:p-5">
      <header>
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-sm text-text-muted">
          Providers listed here are integrations registered in the server code. Configure and enable the ones this site uses.
        </p>
      </header>

      <section className="rounded-brand border border-primary/30 bg-primary-soft p-3 text-sm">
        {kind === "gateway" ? (
          <><strong>Gateway accounts:</strong> COD is built in and needs no Money Account. Enabling an online gateway creates or reuses its PAYMENT_GATEWAY account.</>
        ) : (
          <><strong>Courier accounts:</strong> Configure whether the courier collects COD. Enabling a COD-capable courier creates or reuses its COURIER Money Account.</>
        )}
      </section>

      {!credentialEncryptionReady && (
        <section className="rounded-brand border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Database credential saving is locked until PROVIDER_CREDENTIAL_ENCRYPTION_KEY (at least 32 characters) is configured on the server. Provider credentials are never read from ENV.
        </section>
      )}

      <section className="space-y-3 rounded-brand border border-border bg-surface p-3">
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className={field} name="name" defaultValue={filters.name || ""} placeholder="Provider name" />
          <input className={field} name="code" defaultValue={filters.code || ""} placeholder="Provider code" />
          <button className="button">Search fields</button>
          <input type="hidden" name="adapterKey" value={filters.adapterKey || ""} />
          <input type="hidden" name="status" value={filters.status || ""} />
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <strong>Provider:</strong>
          {adapters.map((adapter) => (
            <Link key={adapter} href={chipHref("adapterKey", adapter)} className={`rounded-full border px-3 py-1 ${filters.adapterKey === adapter ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>{adapter}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <strong>Status:</strong>
          {["ACTIVE", "INACTIVE"].map((status) => (
            <Link key={status} href={chipHref("status", status)} className={`rounded-full border px-3 py-1 ${filters.status === status ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>{status}</Link>
          ))}
          {hasFilters && <Link href={copy.path} className="ml-auto inline-flex items-center gap-1 rounded-brand border border-border px-3 py-1"><X className="h-4 w-4" /> Remove filters</Link>}
        </div>
      </section>

      <section className="responsive-table rounded-brand border border-border bg-surface">
        <table className="min-w-[1050px] text-left text-sm">
          <thead className="bg-surface-muted">
            <tr>{["Order", "Provider", "Integration", "Credentials", "COD", "Money account", "Status", "Actions"].map((head) => <th className="p-3" key={head}>{head}</th>)}</tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const definition = adapterDefinitions.find((item) => item.key === provider.adapterKey);
              const needsCredentials = Boolean(definition?.credentialFields.length);
              return (
                <tr className="border-t border-border" key={provider.id}>
                  <td className="p-3">{provider.sortOrder}</td>
                  <td className="p-3 font-semibold"><span className="block">{provider.name}</span><small className="font-mono text-text-muted">{provider.code}</small></td>
                  <td className={definition?.integrationAvailable ? "p-3 text-success" : "p-3 text-warning"}>
                    {provider.adapterKey} · {definition?.integrationAvailable ? "Available" : "Awaiting official API pack"}
                    {!definition?.integrationAvailable && definition?.availabilityMessage && <small className="block max-w-xs text-text-muted">{definition.availabilityMessage}</small>}
                  </td>
                  <td className="p-3"><span className={provider.readiness.credentialsConfigured ? "text-success" : "text-danger"}>{needsCredentials ? (provider.readiness.credentialsConfigured ? "Configured" : "Not configured") : "Not required"}</span>{needsCredentials && <small className="block text-text-muted">{provider.readiness.credentialSource.replaceAll("_", " ")}</small>}</td>
                  <td className="p-3">{kind === "courier" ? (provider.readiness.supportsCod ? "Available" : "Not available") : provider.adapterKey === "COD" ? "Built in" : "—"}</td>
                  <td className="p-3">{provider.moneyAccount ? `${provider.moneyAccount.name} · ${provider.moneyAccount.type}` : provider.readiness.moneyAccountRequired ? <span className="text-text-muted">Created when enabled</span> : <span className="text-text-muted">Not required</span>}</td>
                  <td className="p-3"><span className={provider.isActive ? "text-success" : "text-danger"}>{provider.isActive ? "ENABLED" : "DISABLED"}</span><small className="block text-text-muted">{provider.readiness.ready ? "Ready" : "Not ready"}</small></td>
                  <td className="p-3"><button disabled={!canUpdate} onClick={() => openEditor(provider)} className="button disabled:opacity-40"><Settings2 className="h-4 w-4" /> Configure</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {!providers.length && <div className="card text-center text-text-muted">No registered provider records were found. Run the Prisma seed for this site.</div>}
      <Pagination pagination={result.pagination} path={copy.path} filters={filters} />

      <Modal isOpen={editing !== null} onClose={closeEditor}>
        {editing && (
          <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-xl font-bold">Configure {editing.name}</h2>
            {!selectedDefinition?.integrationAvailable && selectedDefinition?.availabilityMessage && (
              <p className="rounded-brand border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                {selectedDefinition.availabilityMessage} This provider cannot be enabled yet.
              </p>
            )}
            <input type="hidden" name="id" value={editing.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Display name<input required className={field} name="name" defaultValue={editing.name} /></label>
              <label className="grid gap-1 text-sm font-semibold">Provider code<input readOnly className={`${field} opacity-70`} value={editing.code} /></label>
              <label className="grid gap-1 text-sm font-semibold">Integration<input readOnly className={`${field} opacity-70`} value={editing.adapterKey} /></label>
              <label className="grid gap-1 text-sm font-semibold">Sort order<input className={field} name="sortOrder" type="number" defaultValue={editing.sortOrder} /></label>
              <label className="grid gap-1 text-sm font-semibold">Status<select disabled={!selectedDefinition?.integrationAvailable} className={field} name="isActive" defaultValue={String(editing.isActive)}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
            </div>

            {selectedDefinition?.credentialFields.length > 0 && (
              <section className="space-y-3 rounded-brand border border-border p-3">
                <div><h3 className="font-bold">Client credentials</h3><p className="text-xs text-text-muted">Secret values are password fields and are never returned to the browser. Leave blank to keep the saved value.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedDefinition.credentialFields.map((credential) => {
                    const isVisible = Boolean(visibleCredentials[credential.key]);
                    return (
                      <label key={credential.key} className="grid gap-1 text-sm font-semibold">
                        {credential.label}
                        <span className="relative block">
                          <input
                            disabled={!credentialEncryptionReady}
                            className={`${field} pr-11`}
                            type={isVisible ? "text" : "password"}
                            name={`credential_${credential.key}`}
                            value={credentialValues[credential.key] || ""}
                            onChange={(event) => setCredentialValues((current) => ({
                              ...current,
                              [credential.key]: event.target.value,
                            }))}
                            autoComplete="new-password"
                            placeholder={credentialEncryptionReady ? (editing.readiness.credentialsConfigured ? "Configured — enter only to replace" : "Required before enabling") : "Set encryption master key first"}
                          />
                          <button
                            type="button"
                            disabled={!credentialEncryptionReady || revealingCredential === credential.key}
                            onClick={() => toggleCredentialVisibility(credential)}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-muted hover:text-primary disabled:opacity-40"
                            aria-label={`${isVisible ? "Hide" : "Show"} ${credential.label}`}
                            title={`${isVisible ? "Hide" : "Show"} ${credential.label}`}
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className={`h-4 w-4 ${revealingCredential === credential.key ? "animate-pulse" : ""}`} />}
                          </button>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {editing.readiness.hasDatabaseCredentials && <label className="flex items-center gap-2 text-sm"><input disabled={!credentialEncryptionReady} type="checkbox" name="clearCredentials" value="true" /> Remove saved client credentials (provider will no longer be ready)</label>}
              </section>
            )}

            {selectedDefinition?.configFields.length > 0 && (
              <section className="space-y-3 rounded-brand border border-border p-3">
                <h3 className="font-bold">Provider configuration</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedDefinition.configFields.map((config) => (
                    <label key={config.key} className="grid gap-1 text-sm font-semibold">{config.label}{config.type === "boolean" ? <select className={field} name={`config_${config.key}`} defaultValue={String(editing.nonSecretConfig?.[config.key] ?? config.defaultValue)}><option value="true">{config.trueLabel || "Yes"}</option><option value="false">{config.falseLabel || "No"}</option></select> : <input className={field} type={config.type === "number" ? "number" : "text"} min={config.type === "number" ? "0" : undefined} step={config.type === "number" ? "0.01" : undefined} name={`config_${config.key}`} defaultValue={editing.nonSecretConfig?.[config.key] ?? config.defaultValue} />}</label>
                  ))}
                </div>
              </section>
            )}

            <p className="rounded-brand bg-surface-muted p-3 text-sm text-text-muted">Client secrets are encrypted with AES-256-GCM before database storage. Shared integration constants remain in server code or server ENV.</p>
            <button disabled={pending} className="button w-full">{pending ? "Saving…" : "Save configuration"}</button>
          </form>
        )}
      </Modal>
    </main>
  );
}
