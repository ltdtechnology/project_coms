import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BiEdit } from "react-icons/bi";
import { FaTrash } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import { MdOpenInNew } from "react-icons/md";

import DataTable from "react-data-table-component";
import toast from "react-hot-toast";

import Table from "../../components/table/Table";
import {
  destroyFitoutCategory,
  destroyFitoutSubcategory,
  domainPrefix,
  editHelpDeskCategoriesSetupDetails,
  getFitOutCategoriesSetup,
  getFitoutCategoriesSetupDetails,
  getFitoutDocs,
  getFitoutSubCategoriesSetup,
  getFitoutSubCategoriesSetupDetails,
  getSetupUsers,
  putFitoutCategoriesSetup,
} from "../../api";
import { getItemInLocalStorage } from "../../utils/localStorage";
import FitoutCategory from "./FitoutCategory";
import SubCatPage from "./SubCatPage";
import FitoutDocs from "./FitoutDocs";

// ─── Document Preview Modal ───────────────────────────────────────────────────
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
      <div className="relative z-10 bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: "85vw", height: "88vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 text-sm">Document Preview</h3>
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
            // For other file types (docx, xls, etc.) – use Google Docs viewer
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
const CategoryPage = () => {
  const [page, setPage] = useState("Category");
  const [engineers, setEngineers] = useState([]);

  // ── Category state ──
  const [categories, setCategories] = useState([]);
  const [showCategoryPage, setShowCategoryPage] = useState(false);
  const [catRefresh, setCatRefresh] = useState(false);

  // ── Sub Category state ──
  const [subCategories, setSubCategories] = useState([]);
  const [showSubCatPage, setShowSubCatPage] = useState(false);
  const [subCatRefresh, setSubCatRefresh] = useState(false);

  // ── Documents state ──
  const [documents, setDocuments] = useState([]);
  const [showDocPage, setShowDocPage] = useState(false);
  const [docRefresh, setDocRefresh] = useState(false);

  // ── Edit modal state ──
  const [isCatEditModalOpen, setIsCatEditModalOpen] = useState(false);
  const [catId, setCatId] = useState(null);
  const [formData, setFormData] = useState({
    category: "",
    minTat: "",
    engineer: "",
  });

  // ── Document preview state ──
  const [previewUrl, setPreviewUrl] = useState(null);

  const themeColor = useSelector((state) => state.theme.color);
  const siteId = getItemInLocalStorage("SITEID");

  // ── Fetch categories ──
  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await getFitOutCategoriesSetup();
        setCategories(resp.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetch();
  }, [catRefresh]);

  // ── Fetch sub-categories ──
  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await getFitoutSubCategoriesSetup();
        setSubCategories(resp.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetch();
  }, [subCatRefresh]);

  // ── Fetch documents ──
  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await getFitoutDocs();
        setDocuments(resp.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetch();
  }, [docRefresh]);

  // ── Fetch engineers ──
  useEffect(() => {
    const fetchSetupUser = async () => {
      try {
        const userResp = await getSetupUsers();
        const filteredTechnician = userResp.data.filter(
          (tech) => tech.user_type === "pms_technician"
        );
        setEngineers(filteredTechnician);
      } catch (error) {
        console.log(error);
      }
    };
    fetchSetupUser();
  }, []);

  // ── Delete handlers ──
  const handleCatDelete = async (id) => {
    try {
      await destroyFitoutCategory(id);
      toast.success("Category deleted successfully");
      setCatRefresh((prev) => !prev);
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete category");
    }
  };

  const handleSubCatDelete = async (id) => {
    console.log("Delete ID:", id);

    try {
      await destroyFitoutSubcategory(id);

      toast.success("Sub Category deleted successfully");

      setSubCategories((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.log(error);
      // If backend returns 404 (resource already removed) treat as success
      const status = error?.response?.status;
      if (status === 404 || status === 410) {
        toast.success("Sub Category deleted successfully");
        setSubCategories((prev) => prev.filter((item) => item.id !== id));
        return;
      }
      toast.error("Failed to delete sub category");
    }
  };

  // ── Edit category ──
  const openCatEditModal = async (id) => {
    const fetchCatDetails = await getFitoutCategoriesSetupDetails(id);
    setCatId(id);
    setFormData({
      category: fetchCatDetails.data.name,
      minTat: fetchCatDetails.data.tat,
      engineer: fetchCatDetails.data.assigned_id || "",
    });
    setIsCatEditModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      const validated = value.replace(/[^a-zA-Z]/g, "");
      setFormData({ ...formData, [name]: validated });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleEditCategory = async () => {
    const sendData = new FormData();
    sendData.append("fit_out_setup_category[society_id]", siteId);
    sendData.append("fit_out_setup_category[of_phase]", "pms");
    sendData.append("fit_out_setup_category[name]", formData.category);
    sendData.append("fit_out_setup_category[assigned_id]", formData.engineer);
    try {
      await putFitoutCategoriesSetup(catId, sendData);
      toast.success("Category Updated Successfully");
      setIsCatEditModalOpen(false);
      setCatRefresh((prev) => !prev);
    } catch (error) {
      console.log(error);
    }
  };

  // ── Preview helper ──
  const openPreview = (docUrl) => {
    const fullUrl = docUrl.startsWith("http") ? docUrl : `${domainPrefix}${docUrl}`;
    setPreviewUrl(fullUrl);
  };

  // ── Custom table styles ──
  const customStyles = {
    headRow: {
      style: {
        background: "black",
        color: "white",
        fontSize: "14px",
        fontWeight: "600",
        minHeight: "52px",
      },
    },
    headCells: {
      style: {
        color: "white",
        fontSize: "14px",
        fontWeight: "600",
      },
    },
  };

  // ── Category columns ──
  const CatColumns = [
    {
      name: "Sr.no.",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "150px",
    },
    {
      name: "Category Type",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "File",
      cell: (row) =>
        row.attachfile && row.attachfile.document_url ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => openPreview(row.attachfile.document_url)}
              className="text-blue-600 underline text-left hover:text-blue-800"
            >
              View
            </button>
            <a
              href={`${domainPrefix}${row.attachfile.document_url}`}
              download
              className="text-green-600 underline"
            >
              Download
            </a>
          </div>
        ) : (
          "No File"
        ),
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center gap-4">
          <button onClick={() => openCatEditModal(row.id)}>
            <BiEdit size={15} className="text-blue-500" />
          </button>
          <button onClick={() => handleCatDelete(row.id)}>
            <FaTrash size={15} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  // ── Sub Category columns ──
  const subCatColumns = [
    {
      name: "Sr.no.",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "150px",
    },
    {
      name: "Category",
      selector: (row) => row.category_name || row.fitout_category_name || "-",
      sortable: true,
    },
    {
      name: "Sub Category",
      selector: (row) => row.sub_category_name || row.name || "-",
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center gap-4">
          <button onClick={() => handleSubCatDelete(row.id)}>
            <FaTrash size={15} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  // ── Document columns ──
  const documentColumns = [
    {
      name: "Sr.no.",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "150px",
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Documents",
      cell: (row) =>
        row.fitout_docs && row.fitout_docs.length > 0 ? (
          <div className="flex flex-col gap-1 py-1">
            {row.fitout_docs.map((doc, index) => (
              <div key={index} className="flex gap-3 items-center">
                <button
                  onClick={() => openPreview(doc.document_url)}
                  className="text-blue-600 underline hover:text-blue-800 text-sm"
                >
                  View {index + 1}
                </button>
                <a
                  href={`${domainPrefix}${doc.document_url}`}
                  download
                  className="text-green-600 underline text-sm"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          "No File"
        ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full my-2 flex overflow-hidden flex-col">

      {/* Document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* Tab bar */}
      <div className="flex w-full">
        <div className="flex gap-2 p-2 pb-0 border-b-2 border-gray-200 w-full">
          <h2
            className={`p-1 ${page === "Category"
              ? "bg-white font-medium text-blue-500 shadow-custom-all-sides"
              : ""
              } rounded-t-md px-4 cursor-pointer text-center transition-all duration-300 ease-linear`}
            onClick={() => setPage("Category")}
          >
            Category
          </h2>
          <h2
            className={`p-1 ${page === "SubCategory"
              ? "bg-white font-medium text-blue-500 shadow-custom-all-sides"
              : ""
              } rounded-t-md px-4 cursor-pointer text-center transition-all duration-300 ease-linear`}
            onClick={() => setPage("SubCategory")}
          >
            Sub Category
          </h2>
          <h2
            className={`p-1 ${page === "Documents"
              ? "bg-white font-medium text-blue-500 shadow-custom-all-sides"
              : ""
              } rounded-t-md px-4 cursor-pointer transition-all duration-300 ease-linear`}
            onClick={() => setPage("Documents")}
          >
            Documents
          </h2>
        </div>
      </div>

      {/* ── Category Tab ── */}
      {page === "Category" && (
        <div>
          <div className="flex justify-end">
            <button
              style={{ background: themeColor }}
              onClick={() => setShowCategoryPage((p) => !p)}
              className="p-2 my-2 text-white rounded-md"
            >
              {showCategoryPage ? "Cancel" : "Add Category"}
            </button>
          </div>

          {showCategoryPage && (
            <FitoutCategory
              handleToggleCategoryPage={() => setShowCategoryPage(false)}
              setCatAdded={() => setCatRefresh((p) => !p)}
            />
          )}

          <DataTable
            responsive
            columns={CatColumns}
            data={categories}
            customStyles={customStyles}
            pagination
            paginationPerPage={9}
          />
        </div>
      )}

      {/* ── Sub Category Tab ── */}
      {page === "SubCategory" && (
        <div>
          <div className="flex justify-end">
            <button
              style={{ background: themeColor }}
              onClick={() => setShowSubCatPage((p) => !p)}
              className="p-2 my-2 text-white rounded-md"
            >
              {showSubCatPage ? "Cancel" : "Add Sub Category"}
            </button>
          </div>

          {showSubCatPage && (
            <div className="border border-gray-200 rounded-md p-4 my-2 bg-gray-50">
              <SubCatPage
                handleToggleCategoryPage1={() => setShowSubCatPage(false)}
                setCAtAdded={() => {
                  setSubCatRefresh((p) => !p);
                  setShowSubCatPage(false);
                }}
              />
            </div>
          )}

          <DataTable
            responsive
            columns={subCatColumns}
            customStyles={customStyles}
            data={subCategories}
            pagination
            paginationPerPage={9}
          />
        </div>
      )}

      {/* ── Documents Tab ── */}
      {page === "Documents" && (
        <div>
          <div className="flex justify-end">
            <button
              style={{ background: themeColor }}
              onClick={() => setShowDocPage((p) => !p)}
              className="p-2 my-2 text-white rounded-md"
            >
              {showDocPage ? "Cancel" : "Add Documents"}
            </button>
          </div>

          {showDocPage && (
            <div className="border border-gray-200 rounded-md p-4 my-2 bg-gray-50">
              <FitoutDocs
                handleToggleCategoryPage1={() => setShowDocPage(false)}
                setCAtAdded={() => {
                  setDocRefresh((p) => !p);
                  setShowDocPage(false);
                }}
              />
            </div>
          )}

          <DataTable
            responsive
            columns={documentColumns}
            customStyles={customStyles}
            data={documents}
            pagination
            paginationPerPage={9}
          />
        </div>
      )}

      {/* ── Edit Category Modal ── */}
      {isCatEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsCatEditModalOpen(false)}
          />
          <div className="bg-white overflow-y-auto rounded-lg shadow-lg p-6 relative z-10 w-full max-w-xl">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
              onClick={() => setIsCatEditModalOpen(false)}
            >
              <FaTimes size={20} />
            </button>
            <h2 className="font-semibold mb-4 text-lg">Edit Category</h2>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="form-group">
                <label className="block mb-2 text-sm font-medium">Enter Category</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded"
                  placeholder="Enter Category"
                  value={formData.category}
                  name="category"
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="block mb-2 text-sm font-medium">Select Engineer</label>
                <select
                  className="border p-2 w-full rounded"
                  name="engineer"
                  value={formData.engineer}
                  onChange={handleChange}
                >
                  <option value="">Select Engineer</option>
                  {engineers.map((engineer) => (
                    <option value={engineer.id} key={engineer.id}>
                      {engineer.firstname} {engineer.lastname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="block mb-2 text-sm font-medium">Response Time (min)</label>
                <input
                  type="number"
                  className="border p-2 w-full rounded"
                  placeholder="Response Time"
                  value={formData.minTat}
                  onChange={handleChange}
                  name="minTat"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <button
                style={{ background: themeColor }}
                className="text-white px-6 py-2 rounded-md"
                onClick={handleEditCategory}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
