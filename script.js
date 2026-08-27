const risks = document.querySelectorAll(".risk");

const riskTitle = document.getElementById("risk-title");
const riskText = document.getElementById("risk-text");

const riskDescriptions = {
    "Resistance":
        "People rarely resist change for the reasons leaders assume.",

    "Misalignment":
        "Different stakeholders can believe they are working toward the same outcome when they are not.",

    "Blind Spots":
        "What leadership cannot see can become the greatest source of exposure.",

    "Execution Drift":
        "A strategy can remain intact on paper while execution quietly moves somewhere else."
};

risks.forEach(risk => {

    risk.addEventListener("mouseenter", () => {

        const riskName = risk.dataset.risk;

        riskTitle.textContent = riskName;

        riskText.textContent = riskDescriptions[riskName];

    });

});
