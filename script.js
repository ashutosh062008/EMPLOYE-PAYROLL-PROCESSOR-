// Core Data Storage Key
const STORAGE_KEY = 'payroll_records';

// Base Employee Class
class Employee {
    constructor(name, basePay, taxRate) {
        this.name = name;
        this.basePay = parseFloat(basePay);
        this.taxRate = parseFloat(taxRate) / 100;
    }

    calculateSalary() { return this.basePay; }
    calculateTax() { return this.calculateSalary() * this.taxRate; }
    getNetSalary() { return this.calculateSalary() - this.calculateTax(); }
}

class FullTimeEmployee extends Employee {
    constructor(name, salary, benefits) {
        super(name, salary, 15);
        this.benefitsDeduction = parseFloat(benefits) || 0;
    }
    getNetSalary() { return super.getNetSalary() - this.benefitsDeduction; }
}

class ContractEmployee extends Employee {
    constructor(name, amount, taxRate) { super(name, amount, taxRate); }
}

class HourlyEmployee extends Employee {
    constructor(name, rate, hours) {
        super(name, rate, 10);
        this.hoursWorked = parseFloat(hours);
    }
    calculateSalary() {
        if (this.hoursWorked > 40) {
            return (40 * this.basePay) + ((this.hoursWorked - 40) * (this.basePay * 1.5));
        }
        return this.hoursWorked * this.basePay;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const employeeForm = document.getElementById("employeeForm");
    const empType = document.getElementById("empType");
    const dynamicInputs = document.getElementById("dynamicInputs");
    const payrollList = document.getElementById("payrollList");
    const exportCsvBtn = document.getElementById("exportCsv");
    const clearAllBtn = document.getElementById("clearAll");

    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const inputTemplates = {
        fulltime: `
            <div class="form-group fade-in">
                <label>Monthly Salary (₹)</label>
                <input type="number" id="monthlySalary" placeholder="e.g. 50000" required>
            </div>
            <div class="form-group fade-in">
                <label>Benefits Deduction (₹)</label>
                <input type="number" id="benefits" placeholder="e.g. 2000" required>
            </div>
        `,
        contract: `
            <div class="form-group fade-in">
                <label>Contract Amount (₹)</label>
                <input type="number" id="contractAmount" placeholder="e.g. 150000" required>
            </div>
            <div class="form-group fade-in">
                <label>Tax Rate (%)</label>
                <input type="number" id="customTax" placeholder="e.g. 12" required>
            </div>
        `,
        hourly: `
            <div class="form-group fade-in">
                <label>Hourly Rate (₹)</label>
                <input type="number" id="hourlyRate" placeholder="e.g. 500" required>
            </div>
            <div class="form-group fade-in">
                <label>Hours Worked</label>
                <input type="number" id="hoursWorked" placeholder="e.g. 40" required>
            </div>
        `
    };

    // Initial load
    refreshUI();

    if (empType) {
        empType.addEventListener("change", (e) => {
            dynamicInputs.innerHTML = inputTemplates[e.target.value] || "";
        });
    }

    if (employeeForm) {
        employeeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("empName").value;
            const type = empType.value;
            let empObj;

            if (type === "fulltime") {
                empObj = new FullTimeEmployee(name, document.getElementById("monthlySalary").value, document.getElementById("benefits").value);
            } else if (type === "contract") {
                empObj = new ContractEmployee(name, document.getElementById("contractAmount").value, document.getElementById("customTax").value);
            } else if (type === "hourly") {
                empObj = new HourlyEmployee(name, document.getElementById("hourlyRate").value, document.getElementById("hoursWorked").value);
            }

            const now = new Date();
            const record = {
                id: Date.now(),
                name: empObj.name,
                type: type,
                gross: empObj.calculateSalary(),
                tax: empObj.calculateTax(),
                net: empObj.getNetSalary(),
                date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            };

            records.unshift(record);
            saveRecords();
            refreshUI();
            employeeForm.reset();
            dynamicInputs.innerHTML = "";
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear all records?")) {
                records = [];
                saveRecords();
                refreshUI();
            }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener("click", () => {
            if (records.length === 0) return alert("No records to export.");
            const typeLabels = { fulltime: "Full-Time", contract: "Contract", hourly: "Hourly" };

            let csv = `PayrollPro - Payroll Export\n`;
            csv += `Generated On: ${new Date().toLocaleString()}\n`;
            csv += `Total Records: ${records.length}\n\n`;
            csv += `Date,Time,Employee Name,Type,Gross Salary (₹),Tax Deducted (₹),Net Payable (₹)\n`;
            records.forEach(r => {
                csv += `${r.date},${r.time || "-"},"${r.name}",${typeLabels[r.type] || r.type},${r.gross.toFixed(2)},${r.tax.toFixed(2)},${r.net.toFixed(2)}\n`;
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.setAttribute("hidden", "");
            a.setAttribute("href", url);
            a.setAttribute("download", `payrollpro_export_${Date.now()}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function saveRecords() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function refreshUI() {
        if (!payrollList) return;
        if (records.length === 0) {
            payrollList.innerHTML = `<div class="empty-state"><p>No payroll generated yet. Add an employee to begin.</p></div>`;
            return;
        }

        const typeLabels = { fulltime: "Full-Time", contract: "Contract", hourly: "Hourly" };
        payrollList.innerHTML = records.map(r => `
            <div class="payroll-card" style="animation: none;">
                <div class="card-header">
                    <span class="emp-name">${r.name} <small style="font-weight: 400; font-size: 0.7rem; color: var(--text-muted); opacity: 0.7;">(${r.date}${r.time ? ' · ' + r.time : ''})</small></span>
                    <span class="emp-type-badge ${r.type}">${typeLabels[r.type]}</span>
                </div>
                <div class="card-body">
                    <div class="stat-box"><span class="stat-label">Gross</span><span class="stat-value">₹${r.gross.toFixed(2)}</span></div>
                    <div class="stat-box"><span class="stat-label">Tax</span><span class="stat-value deduction">-₹${r.tax.toFixed(2)}</span></div>
                    <div class="stat-box"><span class="stat-label">Net Payable</span><span class="stat-value net">₹${r.net.toFixed(2)}</span></div>
                </div>
            </div>
        `).join('');
    }
});