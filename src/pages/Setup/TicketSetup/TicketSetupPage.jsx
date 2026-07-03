import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BiEdit } from "react-icons/bi";
import toast from "react-hot-toast";

import TicketCategorySetup from "./TicketCategorySetup";
import Table from "../../../components/table/Table";
import EditStatusModal from "./EditStatusModal";

import {
  getHelpDeskStatusSetup,
  postHelpDeskStatusSetup,
} from "../../../api";
import { getItemInLocalStorage } from "../../../utils/localStorage";

const TicketSetupPage = ({ activeSiteId }) => {
  const themeColor = useSelector((state) => state.theme.color);

  const [page, setPage] = useState("Category Type");
  const [statuses, setStatuses] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState("");

  const [formData, setFormData] = useState({
    status: "",
    fixedState: "",
    color: "#1677ff",
    order: "",
  });

  const [operationalDays, setOperationalDays] = useState({
    Monday: { enabled: false, start: "", end: "" },
    Tuesday: { enabled: false, start: "", end: "" },
    Wednesday: { enabled: false, start: "", end: "" },
    Thursday: { enabled: false, start: "", end: "" },
    Friday: { enabled: false, start: "", end: "" },
    Saturday: { enabled: false, start: "", end: "" },
    Sunday: { enabled: false, start: "", end: "" },
  });

  /* ---------------- FETCH STATUS ---------------- */
  const fetchStatuses = async () => {
    try {
      const res = await getHelpDeskStatusSetup();
      setStatuses(Object.values(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [activeSiteId]); // ✅ re-fetch when site changes

  const handleReset = () => {
    setFormData({
      status: "",
      fixedState: "",
      color: "#1677ff",
      order: "",
    });
  };

  /* ---------------- HANDLERS ---------------- */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddStatus = async () => {
    if (!formData.status || !formData.fixedState || !formData.order) {
      return toast.error("Please fill all fields");
    }

    const siteID = activeSiteId; // ✅ use reactive prop from parent

    const payload = new FormData();
    payload.append("complaint_status[of_phase]", "pms");
    payload.append("complaint_status[society_id]", siteID);
    payload.append("complaint_status[name]", formData.status);
    payload.append("complaint_status[fixed_state]", formData.fixedState);
    payload.append("complaint_status[color_code]", formData.color);
    payload.append("complaint_status[position]", formData.order);

    try {
      await postHelpDeskStatusSetup(payload);

      toast.success("Status added successfully");

      setFormData({
        status: "",
        fixedState: "",
        color: "#1677ff",
        order: "",
      });

      fetchStatuses(); // refresh table
    } catch (err) {
  const message =
    err?.response?.data?.error || "Failed to add status";

  toast.error(message);
}
  };

  const updateDay = (day, field, value) => {
    setOperationalDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleOperationalSubmit = () => {
    const payload = Object.entries(operationalDays)
      .filter(([_, v]) => v.enabled)
      .map(([day, v]) => ({ day, ...v }));

    if (!payload.length) {
      return toast.error("Select at least one operational day");
    }

    console.log(payload);
    toast.success("Operational days saved");
  };

  /* ---------------- TABLE ---------------- */
  const statusColumns = [
    { name: "Order", selector: (row) => row.position },
    { name: "Status", selector: (row) => row.name },
    { name: "Fixed State", selector: (row) => row.fixed_state },
    {
      name: "Color",
      cell: (row) => (
        <div
          className="w-4 h-4 rounded"
          style={{ background: row.color_code }}
        />
      ),
    },
    {
      name: "Action",
      cell: (row) => (
        <button
          onClick={() => {
            setEditId(row.id);
            setShowEditModal(true);
          }}
        >
          <BiEdit />
        </button>
      ),
    },
  ];

  return (
    <div className="w-full my-2">
      {/* Tabs */}
      <div className="flex border-b">
        {["Category Type", "Status", "Operational Days"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 ${page === tab ? "border-b-2 text-blue-500" : ""
              }`}
            onClick={() => setPage(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Category */}
      {page === "Category Type" && <TicketCategorySetup />}

      {/* Status */}
      {page === "Status" && (
        <div className="p-4">
          <div className="grid md:grid-cols-5 gap-2 mb-4">
            <input
              name="status"
              placeholder="Status"
              value={formData.status}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <input
              name="fixedState"
              placeholder="Fixed State"
              value={formData.fixedState}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <input
              name="order"
              type="number"
              placeholder="Order"
              value={formData.order}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <button
              onClick={handleAddStatus}
              className="text-white rounded"
              style={{ background: themeColor }}
            >
              Add
            </button>
            <button
              onClick={handleReset}
              className="text-white rounded bg-black"
            >
              Reset
            </button>
          </div>

          <Table columns={statusColumns} data={statuses} isPagination />
        </div>
      )}

      {/* Operational Days */}
      {page === "Operational Days" && (
        <div className="p-4">
          <table className="w-full border">
            <thead style={{ background: themeColor }} className="text-white">
              <tr>
                <th />
                <th>Day</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(operationalDays).map(([day, data]) => (
                <tr key={day}>
                  <td className="border text-center">
                    <input
                      type="checkbox"
                      checked={data.enabled}
                      onChange={(e) =>
                        updateDay(day, "enabled", e.target.checked)
                      }
                    />
                  </td>

                  <td className="border text-center">{day}</td>

                  <td className="border">
                    <input
                      type="time"
                      disabled={!data.enabled}
                      value={data.start}
                      onChange={(e) =>
                        updateDay(day, "start", e.target.value)
                      }
                    />
                  </td>

                  <td className="border">
                    <input
                      type="time"
                      disabled={!data.enabled}
                      value={data.end}
                      onChange={(e) =>
                        updateDay(day, "end", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-center mt-6">
            <button
              onClick={handleOperationalSubmit}
              className="px-8 py-2 text-white rounded"
              style={{ background: themeColor }}
            >
              Save Operational Days
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditStatusModal
          id={editId}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            setShowEditModal(false);
            fetchStatuses(); // refresh after edit
          }}
        />
      )}
    </div>
  );
};

export default TicketSetupPage;