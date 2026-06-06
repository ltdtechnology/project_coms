import React, { useEffect, useState } from "react";
import ModalWrapper from "../../../containers/modals/ModalWrapper";
import { BiEditAlt } from "react-icons/bi";
import { useSelector } from "react-redux";
import { ColorPicker } from "antd";
import { getHelpDeskStatusDetailsSetup, updateHelpDeskStatus } from "../../../api";
import axiosInstance from "../../../api/axiosInstance";
import { getItemInLocalStorage } from "../../../utils/localStorage";
import toast from "react-hot-toast";

const EditStatusModal = ({ onClose, id, onUpdated }) => {
  const themeColor = "rgb(17, 24, 39)"; 

  const [formData, setFormData] = useState({
    status: "",
    fixedState: "",
    color: "",
    order: "",
  });

  const [loading, setLoading] = useState(false);

  const siteID = getItemInLocalStorage("SITEID");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Color picker handler
  const handleColorChange = (color) => {
    setFormData((prev) => ({
      ...prev,
      color: color.toHexString(),
    }));
  };

  useEffect(() => {
    if (!id) return;

    const fetchStatusDetails = async () => {
      try {
        const res = await getHelpDeskStatusDetailsSetup(id);
        const detail = res.data;

        setFormData({
          status: detail.name || "",
          fixedState: detail.fixed_state || "",
          color: detail.color_code || "",
          order: detail.position || "",
        });
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load status details");
      }
    };

    fetchStatusDetails();
  }, [id]);

  const handleEditStatus = async () => {
    if (!id) {
      toast.error("Invalid Status ID");
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();

      payload.append("complaint_status[name]", formData.status);
      payload.append(
        "complaint_status[fixed_state]",
        formData.fixedState
      );

      // remove extra quotes if any
      payload.append(
        "complaint_status[color_code]",
        formData.color.replace(/"/g, "")
      );

      payload.append(
        "complaint_status[position]",
        String(formData.order)
      );

      payload.append("complaint_status[of_phase]", "pms");

      payload.append(
        "complaint_status[society_id]",
        String(siteID)
      );

      const response = await updateHelpDeskStatus(id, payload);

      console.log("Update Success:", response.data);

      toast.success("Status updated successfully");

      if (onUpdated) {
        onUpdated();
      }

      onClose();
    } catch (error) {
      console.error("UPDATE ERROR:", error?.response || error);

      toast.error(
        error?.response?.data?.message || "Update failed"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <ModalWrapper onclose={onClose}>
      <div>
        <h2 className="font-medium text-xl flex items-center gap-4 border-b border-gray-300 pb-2">
          <BiEditAlt /> Edit Status
        </h2>

        <div className="m-2">
          <div className="grid md:grid-cols-2 gap-4 m-2">
            <input
              type="text"
              placeholder="Enter status"
              className="border p-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={handleChange}
              name="status"
            />

            <select
              name="fixedState"
              onChange={handleChange}
              value={formData.fixedState}
              className="border p-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Fixed State</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="complete">Complete</option>
            </select>

            <div className="flex items-center">
              <ColorPicker
                value={formData.color || "#1677ff"}
                format="hex"
                onChange={handleColorChange}
                size="large"
              />
              <span className="ml-2 text-sm text-gray-600 font-mono">
                {formData.color || "#1677ff"}
              </span>
            </div>

            <input
              type="number"
              placeholder="Enter order"
              className="border p-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.order}
              onChange={handleChange}
              name="order"
              min="0"
            />
          </div>

          <button
            className="font-medium transition-all w-full p-2 rounded-md text-white cursor-pointer text-center flex items-center gap-2 justify-center mt-4"
            style={{
              background: themeColor,
              opacity: loading ? 0.7 : 1,
            }}
            onClick={handleEditStatus}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default EditStatusModal;