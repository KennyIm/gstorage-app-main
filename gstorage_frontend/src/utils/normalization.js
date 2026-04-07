export const normalizeRUT = (rut) => {
  if (!rut) return '';
  let value = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
  if (value.length < 2) return value;
  const body = value.slice(0, -1);
  const dv = value.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

export const normalizePhone = (tel) => {
  if (!tel) return '';

  let cleaned = tel.replace(/\s/g, ''); 
  if (cleaned.startsWith('+56')) return tel.trim();
  if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
    return `+56 9 ${cleaned.slice(1, 5)} ${cleaned.slice(5)}`;
  }
  return tel.trim();
};

export const normalizeCity = (city) => {
  if (!city) return '';
  return city
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const normalizeEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

export const normalizeName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};