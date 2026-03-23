function updateCalendar() {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const month = monthNames[now.getMonth()];

  document.getElementById("day").textContent = day;
  document.getElementById("month").textContent = month;
}

function showView(viewId) {
  const views = ["homeView", "calendarView"];

  views.forEach((id) => {
    const view = document.getElementById(id);
    if (!view) {
      return;
    }

    view.classList.toggle("hidden-view", id !== viewId);
  });
}

const openCalendarBtn = document.getElementById("openCalendarBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

if (openCalendarBtn) {
  openCalendarBtn.addEventListener("click", () => {
    showView("calendarView");
  });
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener("click", () => {
    showView("homeView");
  });
}

showView("homeView");
updateCalendar();
