const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError("Can't reach the server. Check that the backend is running on port 5000.", 0);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const e = json?.error || {};
    throw new ApiError(e.message || `Request failed (${res.status})`, res.status, e.details);
  }
  return json;
}

const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  health: (opts) => request('/health', opts),
  overview: (months, opts) => request(`/metrics/overview${qs({ months })}`, opts),
  activity: (limit = 15, opts) => request(`/activity${qs({ limit })}`, opts),

  customers: (params, opts) => request(`/customers${qs(params)}`, opts),
  customer: (id, opts) => request(`/customers/${id}`, opts),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PATCH', body: data }),
  setCustomerStatus: (id, status, reason) => request(`/customers/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  exportUrl: (params) => `${API_BASE}/customers/export${qs(params)}`,

  plans: (opts) => request('/plans', opts),
  createPlan: (data) => request('/plans', { method: 'POST', body: data }),
  updatePlan: (id, data) => request(`/plans/${id}`, { method: 'PATCH', body: data }),
  deletePlan: (id) => request(`/plans/${id}`, { method: 'DELETE' }),

  importCustomers: (file, dryRun) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/imports/customers${qs({ dryRun: dryRun ? 'true' : 'false' })}`, { method: 'POST', body: fd });
  },
  templateUrl: () => `${API_BASE}/imports/template`,
};
