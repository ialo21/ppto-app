export function getYearOptions(
  pastYears = 5,
  futureYears = 1,
  includeAll = true
) {
  const currentYear = new Date().getFullYear();
  const options = includeAll ? [{ value: "", label: "Todos" }] : [];
  for (let i = currentYear + futureYears; i >= currentYear - pastYears; i--) {
    options.push({ value: i.toString(), label: i.toString() });
  }
  return options;
}
