import React, { useEffect, useState } from "react";
import {
  getServicesRoutineList,
  getSoftServiceStatus,
} from "../../api";
import Table from "../../components/table/Table";
import { Link } from "react-router-dom";
import { BsEye } from "react-icons/bs";
import Services from "../Services";
import Navbar from "../../components/Navbar";
import * as XLSX from "xlsx";
import { DNA } from "react-loader-spinner";
import { useSelector } from "react-redux";
import { Pagination } from "antd";
import { getItemInLocalStorage } from "../../utils/localStorage";

const ServicesTask = () => {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [filteredRoutineData, setFilteredRoutineData] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [searchRoutineText, setSearchRoutineText] = useState("");

  const [pageNo, setPageNo] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(tomorrow));

  const themeColor = useSelector((state) => state.theme.color);


  /* ================= DATE FORMAT ================= */
  const dateFormat = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    complete: 0,
    overdue: 0,
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case "complete":
        return selectedStatus === status
          ? "border-green-600 bg-green-100 text-green-700"
          : "border-green-300";

      case "pending":
        return selectedStatus === status
          ? "border-yellow-500 bg-yellow-100 text-yellow-700"
          : "border-yellow-300";

      case "overdue":
        return selectedStatus === status
          ? "border-red-600 bg-red-100 text-red-700"
          : "border-red-300";

      default: // all
        return selectedStatus === status
          ? "border-blue-600 bg-blue-100 text-blue-700"
          : "border-gray-300";
    }
  };
  /* ================= TABLE ================= */
  const routineColumn = [
    {
      name: "Action",
      cell: (row) => (
        <Link to={`/service/checklist/${row.soft_service_id}/${row.id}`}>
          <BsEye size={15} />
        </Link>
      ),
    },
    {
      name: "Service Name",
      selector: (row) => row.soft_service_name,
      sortable: true,
    },
    {
      name: "Checklist Name",
      selector: (row) => row.checklist_name,
      sortable: true,
      width: "400px",
    },
    {
      name: "Start Date",
      selector: (row) => dateFormat(row.start_time),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
    },
    {
      name: "Assigned To",
      selector: (row) => row.assigned_to_name,
    },
  ];

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      let response;

      const start = startDate ? `${startDate}T00:00:00` : "";
      const end = endDate ? `${endDate}T23:59:59` : "";

      if (selectedStatus === "all") {
        response = await getServicesRoutineList(
          pageNo,
          perPage,
          start,
          end
        );

        const data = response.data.activities.filter(
          (item) => item.soft_service_name
        );

        setFilteredRoutineData(data);
        setRoutines(data);

        // ✅ FIXED
        setTotal(response.data.total_count || 0);

      } else {
        response = await getSoftServiceStatus(
          selectedStatus,
          start,
          end
        );

        const data = response.data.activities.filter(
          (item) => item.soft_service_name
        );

        setRoutines(data);

        // ✅ manual pagination
        const startIndex = (pageNo - 1) * perPage;
        const endIndex = startIndex + perPage;

        setFilteredRoutineData(data.slice(startIndex, endIndex));

        setTotal(data.length); // correct
      }
    } catch (error) {
      console.error(error);
    }
  };


  const fetchStatusCounts = async () => {
    try {
      const start = startDate ? `${startDate}T00:00:00` : "";
      const end = endDate ? `${endDate}T23:59:59` : "";

      const res = await getServicesRoutineList(1, 10000, start, end);

      const data = res.data.activities || [];

      const counts = {
        all: data.length,
        pending: data.filter((i) => i.status === "pending").length,
        complete: data.filter((i) => i.status === "complete").length,
        overdue: data.filter((i) => i.status === "overdue").length,
      };

      setStatusCounts(counts);
    } catch (err) {
      console.log(err);
    }
  };



  useEffect(() => {
    fetchData();
    fetchStatusCounts();
  }, [pageNo, perPage, selectedStatus, startDate, endDate]); // ✅ re-fetch when site changes

  /* ================= STATUS FILTER ================= */
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setPageNo(1);
  };

  /* ================= SEARCH ================= */
  const handleRoutineSearch = async (e) => {
  const value = e.target.value;
  setSearchRoutineText(value);
  setPageNo(1);

  try {
    const start = startDate ? `${startDate}T00:00:00` : "";
    const end = endDate ? `${endDate}T23:59:59` : "";

    const response = await getServicesRoutineList(
      1,
      10000,
      start,
      end
    );

    const allData = response.data.activities || [];

    const filtered = allData.filter((item) =>
      [
        item.soft_service_name,
        item.checklist_name,
        item.status,
        item.assigned_to_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value.toLowerCase())
    );

    // Store all searched records
    setRoutines(filtered);

    // Show only first page records
    setFilteredRoutineData(filtered.slice(0, perPage));

    setTotal(filtered.length);
  } catch (error) {
    console.log(error);
  }
};
  /* ================= DATE FILTER ================= */
  const handleApplyDateFilter = () => {
    setPageNo(1);
    fetchData();
  };

  const handleClearDateFilter = () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date) => date.toISOString().split("T")[0];

    setStartDate(formatDate(today));
    setEndDate(formatDate(tomorrow));

    setPageNo(1);
  };

  /* ================= EXPORT ================= */
  const exportToExcel = async () => {
    try {
      const start = startDate ? `${startDate}T00:00:00` : "";
      const end = endDate ? `${endDate}T23:59:59` : "";

      let data = [];

      if (selectedStatus === "all") {
        // ✅ fetch ALL records (no pagination limit)
        const res = await getServicesRoutineList(1, 10000, start, end);
        data = res.data.activities || [];
      } else {
        // ✅ already returns full data
        const res = await getSoftServiceStatus(
          selectedStatus,
          start,
          end
        );
        data = res.data.activities || [];
      }

      // ✅ Apply same filter (remove null names)
      data = data.filter((item) => item.soft_service_name);

      // ✅ Apply SEARCH filter also
      if (searchRoutineText) {
        const value = searchRoutineText.toLowerCase();
        data = data.filter((item) =>
          [
            item.soft_service_name,
            item.checklist_name,
            item.status,
            item.assigned_to_name,
          ]
            .join(" ")
            .toLowerCase()
            .includes(value)
        );
      }

      // ✅ Prepare export data
      const exportData = data.map((row) => ({
        "Service Name": row.soft_service_name,
        "Checklist Name": row.checklist_name,
        "Start Date": dateFormat(row.start_time),
        Status: row.status,
        "Assigned To": row.assigned_to_name,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const blob = new Blob([buffer]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Service_Task.xlsx";
      link.click();

    } catch (error) {
      console.error(error);
    }
  };
  /* ================= PAGINATION ================= */
 const handlePageChange = (page, pageSize) => {
  setPageNo(page);
  setPerPage(pageSize);

  // When search is active
  if (searchRoutineText) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    setFilteredRoutineData(
      routines.slice(startIndex, endIndex)
    );
  }
};

useEffect(() => {
  if (searchRoutineText && routines.length > 0) {
    const startIndex = (pageNo - 1) * perPage;
    const endIndex = startIndex + perPage;

    setFilteredRoutineData(
      routines.slice(startIndex, endIndex)
    );
  }
}, [pageNo, perPage, routines, searchRoutineText]);

  return (
    <section className="flex">
      <Navbar />

      <div className="w-full mx-3 flex flex-col">
        <Services />

        {/* ================= STATUS CARDS ================= */}
        <div className="grid grid-cols-4 gap-3 my-4">
          {["all", "pending", "complete", "overdue"].map((status) => (
            <div
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`cursor-pointer p-4 rounded-lg text-center border ${getStatusStyle(status)}`}
            >
              <p className="capitalize">{status}</p>

              <p className="text-xl font-bold">
                {statusCounts[status] || 0}
              </p>
            </div>
          ))}
        </div>

        {/* ================= FILTER ================= */}
        <div className="flex justify-between items-center my-3">

          {/* 🔹 LEFT: Search */}
          <input
            type="text"
            placeholder="Search By Service, Checklist, Status, Assigned To..."
            value={searchRoutineText}
            onChange={handleRoutineSearch}
            className="border p-2 rounded w-[500px]"
          />

          {/* 🔹 RIGHT: Filters */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 rounded"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 rounded"
            />

            <button
              onClick={handleApplyDateFilter}
              className="text-white p-2 rounded bg-black"
            >
              Apply
            </button>

            <button
              onClick={handleClearDateFilter}
              className="bg-red-500 text-white p-2 rounded"
            >
              Clear
            </button>

            <button
              onClick={exportToExcel}
              className="bg-green-500 text-white p-2 rounded"
            >
              Export ({total})
            </button>
          </div>
        </div>

        {/* ================= TABLE ================= */}
        {filteredRoutineData.length > 0 ? (
          <>
            <Table
              columns={routineColumn}
              data={filteredRoutineData}
              pagination={false}
            />

            <div className="flex justify-end mt-3 mb-6">
              <Pagination
                current={pageNo}
                total={total}   // ✅ now correct (66)
                pageSize={perPage}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total}`
                }
              />
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-40 text-gray-500">
            No Data Found
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesTask;