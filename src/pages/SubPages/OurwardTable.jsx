import React, { useState,useEffect } from "react";
import { PiPlusCircle } from "react-icons/pi";
import { Link } from "react-router-dom";
//import Navbar from "../../../components/Navbar";
import DataTable from "react-data-table-component";
import { BsEye } from "react-icons/bs";
import { useSelector } from "react-redux";
import { BiEdit } from "react-icons/bi";
import { TiTick } from "react-icons/ti";
import { IoClose } from "react-icons/io5";
import Table from "../../components/table/Table";
import { dateFormat, formatTime } from "../../utils/dateUtils";

const OutwardsTable = ({ goodsOut }) => {
  const [filteredData, setFilteredData] = useState(goodsOut);
  const themeColor = useSelector((state) => state.theme.color);

  const columns = [
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center gap-4">
          <Link to={`/admin/inwards-details/${row.id}`}>
            <BsEye size={15} />
          </Link>
          <Link to={`/admin/passes/edit/goods-in-out/${row.id}`}>
            <BiEdit size={17} />
          </Link>
        </div>
      ),
    },

    {
      name: "Type",
      selector: (row) => (row.ward_type === "in" ? "Inward" : "Outward"),
      sortable: true,
    },

    {
      name: "Person Name",
      selector: (row) =>
        typeof row.person_name === "object"
          ? row.person_name?.name
          : row.person_name,
      sortable: true,
    },

    {
      name: "Vehicle Number",
      selector: (row) => row.vehicle_no,
      sortable: true,
    },
    {
      name: "Goods In Time",
      selector: (row) => formatTime(row.goods_in_time),
      sortable: true,
    },

    {
      name: "Goods out Time",
      selector: (row) => formatTime(row.goods_out_time),
      sortable: true,
    },
    {
      name: "Created on",
      selector: (row) => dateFormat(row.created_at),
      sortable: true,
    },
  ];
  const [searchText, setSearchText] = useState("");

  const handleSearch = (e) => {
    const searchValue = e.target.value;
    setSearchText(searchValue);

    if (searchValue.trim() === "") {
      setFilteredData(goodsOut);
      return;
    }

    const filteredResult = goodsOut.filter((item) => {
      const personName =
        typeof item.person_name === "object"
          ? item.person_name?.name || ""
          : item.person_name || "";

      const vehicleNo = item.vehicle_no || "";

      return (
        personName.toLowerCase().includes(searchValue.toLowerCase()) ||
        vehicleNo.toLowerCase().includes(searchValue.toLowerCase())
      );
    });

    setFilteredData(filteredResult);
  };
  useEffect(() => {
    setFilteredData(goodsOut);
  }, [goodsOut]);

  return (
    <section className="flex">
      <div className=" w-full flex mx-3 flex-col overflow-hidden">
        <div className="flex md:flex-row flex-col gap-5 justify-between my-2">
          <input
            type="text"
            name=""
            id=""
            value={searchText}
            onChange={handleSearch}
            className="border-gray-300 border rounded-md p-2 w-full placeholder:text-sm"
            placeholder="Search by name, vehicle number"
          />
          <Link
            to={"/admin/passes/add-goods-in-out"}
            className="p-1 font-medium px-4 text-white rounded-md flex items-center gap-2"
            style={{ background: "rgb(3 19 37)" }}
          >
            {" "}
            <PiPlusCircle /> Add
          </Link>
        </div>
        <Table columns={columns} data={filteredData} isPagination={true} />
      </div>
    </section>
  );
};

export default OutwardsTable;
