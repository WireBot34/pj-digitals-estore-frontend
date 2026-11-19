/**
 * Turns every data table into stacked cards on phones, without editing each table.
 * It copies each column heading onto its cells as data-label; the CSS in index.css
 * (max-width: 767px) does the rest. On larger screens nothing changes.
 * Add class "keep-table" to a table that must stay a real table on phones.
 */
export function installResponsiveTables() {
  let queued = false;
  const label = () => {
    queued = false;
    document.querySelectorAll("table:not(.keep-table)").forEach((table) => {
      table.classList.add("rt");
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
      table.querySelectorAll("tbody tr").forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (td.tagName === "TD" && !td.hasAttribute("data-label")) td.setAttribute("data-label", heads[i] || "");
        });
      });
    });
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(label); } };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => observer.disconnect();
}
