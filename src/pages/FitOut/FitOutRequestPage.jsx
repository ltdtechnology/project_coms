import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import {
  domainPrefix,
  getAllFloors,
  getAllUnits,
  getAllVendors,
  getBuildings,
  getFitOutCategoriesSetup,
  getFloors,
  getSetupUsers,
  getUnits,
  getVendors,
  postFitoutRequest,
} from "../../api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { MdOpenInNew } from "react-icons/md";

// ─── Document Preview Modal (same as CategoryPage) ───────────────────────────
const DocumentPreviewModal = ({ url, onClose }) => {
  if (!url) return null;

  const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i.test(url);
  const isPdf = /\.pdf(\?.*)?$/i.test(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70"
        onClick={onClose}
      />

      {/* Modal box */}
      <div
        className="relative z-10 bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: "85vw", height: "88vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 text-sm">
            Document Preview
          </h3>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              <MdOpenInNew size={16} /> Open in new tab
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-hidden p-2">
          {isImage ? (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded">
              <img
                src={url}
                alt="Document Preview"
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={url}
              title="Document Preview"
              className="w-full h-full rounded border-0"
            />
          ) : (
            // For other file types (docx, xls, etc.) — use Google Docs viewer
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              title="Document Preview"
              className="w-full h-full rounded border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FitOutRequestPage = () => {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([{ id: 1, category_type: "" }]);
  const [categoryFiles, setCategoryFiles] = useState({});
  const navigate = useNavigate();

  const [fitOutSetup, setFitOutCat] = useState([]);

  // ── Preview state ──
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    building_id: "",
    floor_id: "",
    unit_id: "",
    user_id: "",
    description: "",
    selected_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
  });

  const handleFileUpload = (event, categoryId) => {
    const file = event.target.files[0];
    if (file) {
      setCategoryFiles((prev) => ({ ...prev, [categoryId]: file }));
    }
  };

  const getFileType = (url) => {
    if (!url) return "";
    const extension = url.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension))
      return "image";
    if (extension === "pdf") return "pdf";
    return "other";
  };

  const handleCategoryChange = (event, categoryId) => {
    const { value } = event.target;
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, category_type: value } : cat
      )
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addCategory = () => {
    setCategories([...categories, { id: categories.length + 1 }]);
  };

  const removeCategory = (id) => {
    setCategories(categories.filter((cat) => cat.id !== id));
  };

  const fetchDetails = async () => {
    try {
      const buildingsRes = await getBuildings();
      setBuildings(buildingsRes.data);

      const floorsRes = await getAllFloors();
      setFloors(floorsRes.data);

      const unitsRes = await getAllUnits();
      setUnits(unitsRes.data);

      const usersRes = await getSetupUsers();
      setUsers(usersRes.data);

      const vendorsRes = await getAllVendors();
      setVendors(vendorsRes.data);

      const setupCategorie = await getFitOutCategoriesSetup();
      setFitOutCat(
        Array.isArray(setupCategorie.data) ? setupCategorie.data : []
      );
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const [key, value] of Object.entries(formData)) {
      if (!value) {
        toast.error("Please fill all the fields.");
        return;
      }
    }

    if (
      categories.length === 0 ||
      categories.some((cat) => !cat.category_type)
    ) {
      toast.error("Please select a category for each entry.");
      return;
    }

    if (categories.some((cat) => !categoryFiles[cat.id])) {
      toast.error("Please upload a file for each category.");
      return;
    }

    const requestData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      requestData.append(`fitout_request[${key}]`, value);
    });
    categories.forEach((category) => {
      requestData.append(
        `fitout_request[category_types][]`,
        category.category_type
      );
    });
    Object.entries(categoryFiles).forEach(([categoryId, file]) => {
      requestData.append(`fitout_request[category_images][]`, file);
    });

    try {
      await postFitoutRequest(requestData);
      toast.success("Fitout request submitted successfully!");
      navigate("/fitout/request/list");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit the request.");
    }
  };

  // ── Preview helper ──
  const openPreview = (docUrl) => {
    const fullUrl = docUrl.startsWith("http")
      ? docUrl
      : `${domainPrefix}${docUrl}`;
    setPreviewUrl(fullUrl);
  };

  return (
    <div className="flex">
      {/* Document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      <Navbar />
      <div className="flex-1 p-4 bg-gray-100">
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-w-4xl mx-auto">
            {/* Basic Details */}
            <div className="border rounded-lg p-6 w-full shadow-md bg-white">
              <h2 className="text-xl font-semibold text-orange-600 flex items-center mb-4">
                🏢 BASIC DETAILS
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  name="building_id"
                  value={formData.building_id}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Building *</option>
                  {buildings.map((building, index) => (
                    <option key={`${building.id}-${index}`} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>

                <select
                  name="floor_id"
                  value={formData.floor_id}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Floor *</option>
                  {floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>

                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Unit *</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>

                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select User *</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstname} {user.lastname}
                    </option>
                  ))}
                </select>

                <textarea
                  name="description"
                  value={formData.description}
                  placeholder="Description"
                  onChange={handleChange}
                  className="border p-2 rounded w-full md:col-span-2"
                />

                <input
                  type="date"
                  value={formData.selected_date}
                  name="selected_date"
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                />

                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Attachment */}
            <div className="border rounded-lg p-6 shadow-md bg-white mt-6">
              <h2 className="text-xl font-semibold text-orange-600 flex items-center mb-4">
                📎 CATEGORY AND ATTACHMENT
              </h2>

              {categories.map((category) => {
                const selectedCatObj = fitOutSetup.find(
                  (cat) =>
                    String(cat.id) === String(category.category_type)
                );
                const attachfile = selectedCatObj?.attachfile;

                return (
                  <div
                    key={category.id}
                    className="flex flex-wrap items-center gap-4 mt-4 p-4 bg-gray-100 rounded-md"
                  >
                    <select
                      className="border p-2 rounded w-full md:w-auto flex-1"
                      value={category.category_type}
                      onChange={(e) => handleCategoryChange(e, category.id)}
                    >
                      <option value="">Select Category</option>
                      {fitOutSetup.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, category.id)}
                      className="border p-2 rounded w-full md:w-auto flex-1"
                    />

                    {/* Show attachfile thumbnail + preview/download buttons */}
                    {attachfile && attachfile.document_url && (
                      <div className="flex flex-col gap-2 w-full">
                        {/* Inline thumbnail for images */}
                        {getFileType(attachfile.document_url) === "image" && (
                          <img
                            src={domainPrefix + attachfile.document_url}
                            alt="Preview"
                            className="w-40 h-40 object-cover border rounded-md cursor-pointer"
                            onClick={() =>
                              openPreview(attachfile.document_url)
                            }
                          />
                        )}

                        <div className="flex gap-4 items-center">
                          {/* View — opens in-app preview modal */}
                          <button
                            type="button"
                            onClick={() =>
                              openPreview(attachfile.document_url)
                            }
                            className="text-blue-600 underline hover:text-blue-800 text-sm"
                          >
                            View File
                          </button>

                          {/* Download */}
                          <a
                            href={domainPrefix + attachfile.document_url}
                            download
                            rel="noopener noreferrer"
                            className="text-green-600 underline text-sm"
                          >
                            Download File
                          </a>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => removeCategory(category.id)}
                      type="button"
                      className="bg-red-600 text-white p-2 rounded text-sm"
                    >
                      x Remove
                    </button>
                  </div>
                );
              })}

              <button
                onClick={addCategory}
                type="button"
                className="mt-4 bg-gray-700 text-white py-2 px-4 rounded w-full md:w-auto"
              >
                + Add Category
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-6 bg-gray-700 text-white py-3 px-6 rounded w-full"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FitOutRequestPage;
