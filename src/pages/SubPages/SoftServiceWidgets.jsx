import React, { useEffect, useState } from "react";
import { getSoftServices, getServicesChecklist, getServicesTaskList } from "../../api";
import Navbar from "../../components/Navbar";
import Table from "../../components/table/Table";
import { Link } from "react-router-dom";
import { BsEye } from "react-icons/bs";
import { BiEdit } from "react-icons/bi";
import { DNA } from "react-loader-spinner";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const SoftServiceWidgets = () => {
  const [filteredData, setFilteredData] = useState([]);
  const [filteredRoutineData, setFilteredRoutineData] = useState({
    total_services: 0,
    total_checklist: 0,
    total_tasks: 0,
    pending_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
    tasks_performed_today: 0,
    avg_tasks_performed_today: 0,
    tasks_due_today: 0,
    avg_tasks_completed: 0,
    by_building: {},
    by_floor: {},
    by_assigned_user: {},
    by_task_status: {},
    by_status_delay: {},
    status_delay_count: 0,
  });
  const [filteredChecklistData, setFilteredChecklistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showData, setShowData] = useState("all");
  const [pendingCount, setPendingCount] = useState(0);
  const [completeCount, setCompleteCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const taskStatusChartData = {
    labels: Object.keys(filteredRoutineData.by_task_status || {}),
    datasets: [
      {
        data: Object.values(filteredRoutineData.by_task_status || {}),
        backgroundColor: [
          "#36A2EB",
          "#4F46E5",
          "#22C55E",
          "#F97316",
          "#64748B",
          "#A855F7",
        ],
        borderWidth: 1,
      },
    ],
  };

  const buildingChartData = {
    labels: Object.keys(filteredRoutineData.by_building || {}),
    datasets: [
      {
        label: "Services",
        data: Object.values(filteredRoutineData.by_building || {}),
        backgroundColor: "#3B82F6",
      },
    ],
  };

  const floorChartData = {
    labels: Object.keys(filteredRoutineData.by_floor || {}),
    datasets: [
      {
        label: "Services",
        data: Object.values(filteredRoutineData.by_floor || {}),
        backgroundColor: "#10B981",
      },
    ],
  };

  const userChartData = {
    labels: Object.keys(filteredRoutineData.by_assigned_user || {}),
    datasets: [
      {
        label: "Tasks",
        data: Object.values(filteredRoutineData.by_assigned_user || {}),
        backgroundColor: "#8B5CF6",
      },
    ],
  };
  useEffect(() => {
    try {
      const fetchServicesChecklist = async () => {
        const checklistResponse = await getServicesChecklist();
        const sortedChecklists = checklistResponse.data.checklists.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setFilteredChecklistData(sortedChecklists);
        // setChecklists(sortedChecklists);
        console.log(checklistResponse);
      };
      fetchServicesChecklist();
    } catch (error) {
      console.log(error);
    }
  }, []);
  useEffect(() => {
    const fetchServiceRoutine = async () => {
      try {
        const ServiceRoutineResponse = await getServicesTaskList();
        console.log("soft services dashboard", ServiceRoutineResponse)
        setFilteredRoutineData(ServiceRoutineResponse.data)
      } catch (error) {
        console.log(error);
      }
    };

    fetchServiceRoutine();
  }, []);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);

        const serviceResponse = await getSoftServices();

        const sortedServiceData = (serviceResponse.data || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        setFilteredData(sortedServiceData);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, []);
  const dateFormat = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  const column = [
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center gap-4">
          <Link to={`/services/service-details/${row.id}`}>
            <BsEye size={15} />
          </Link>
          <Link to={`/services/edit-service/${row.id}`}>
            <BiEdit size={15} />
          </Link>
        </div>
      ),
    },

    {
      name: "Service Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Building",
      selector: (row) => row.building_name,
      sortable: true,
    },
    {
      name: "Floor",
      selector: (row) => row.floor_name,
      sortable: true,
    },
    {
      name: "Unit",
      cell: (row) =>
        row?.units?.map((unit) => unit.name).join(", "),
      sortable: true,
    },

    {
      name: "Created by",
      selector: (row) => row.user_name,
      sortable: true,
    },

    {
      name: "Created On",
      selector: (row) => dateFormat(row.created_at),
      sortable: true,
    },
  ];
  return (
    <section className="flex bg-gray-100 min-h-screen">
      <Navbar />

      <div className="flex-1 p-6 overflow-auto">

        {/* Dashboard Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Soft Services Dashboard
          </h1>
          <p className="text-gray-500">
            Overview of Services, Checklists and Tasks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">

          <div className="bg-blue-100 border-l-4 border-blue-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Total Services</p>
            <h2 className="text-3xl font-bold text-blue-600">
              {filteredRoutineData.total_services}
            </h2>
          </div>

          <div className="bg-green-100 border-l-4 border-green-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Checklists</p>
            <h2 className="text-3xl font-bold text-green-600">
              {filteredRoutineData.total_checklist}
            </h2>
          </div>

          <div className="bg-purple-100 border-l-4 border-purple-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Total Tasks</p>
            <h2 className="text-3xl font-bold text-purple-600">
              {filteredRoutineData.total_tasks}
            </h2>
          </div>

          <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Pending</p>
            <h2 className="text-3xl font-bold text-yellow-600">
              {filteredRoutineData.pending_tasks}
            </h2>
          </div>

          <div className="bg-emerald-100 border-l-4 border-emerald-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Completed</p>
            <h2 className="text-3xl font-bold text-emerald-600">
              {filteredRoutineData.completed_tasks}
            </h2>
          </div>

          <div className="bg-red-100 border-l-4 border-red-500 rounded-xl p-5 shadow-sm">
            <p className="text-gray-600 text-sm">Overdue</p>
            <h2 className="text-3xl font-bold text-red-600">
              {filteredRoutineData.overdue_tasks}
            </h2>
          </div>

        </div>

        {/* Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Task Status Pie Chart */}
          <div className="bg-[#1e293b] rounded-xl shadow-lg p-5">
            <h3 className="text-white text-lg font-semibold text-center mb-4">
              Tasks by Status
            </h3>

            <div className="h-[350px]">
              <Pie
                data={taskStatusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        color: "#fff",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Today's Performance */}
          <div className="bg-white rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-5">
              Today's Performance
            </h3>

            <div className="space-y-5">

              <div>
                <div className="flex justify-between mb-2">
                  <span>Tasks Performed</span>
                  <span>{filteredRoutineData.tasks_performed_today}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{
                      width: `${Math.min(
                        (filteredRoutineData.tasks_performed_today /
                          (filteredRoutineData.tasks_due_today || 1)) *
                        100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span>Tasks Due Today</span>
                  <span>{filteredRoutineData.tasks_due_today}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span>Average Completed</span>
                  <span>{filteredRoutineData.avg_tasks_completed}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full"
                    style={{
                      width: `${filteredRoutineData.avg_tasks_completed}%`,
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-white rounded-xl shadow-lg p-5">
            <h3 className="font-semibold mb-4">
              Building Wise Services
            </h3>

            <Bar
              data={buildingChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5">
            <h3 className="font-semibold mb-4">
              Floor Wise Services
            </h3>

            <Bar
              data={floorChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5">
            <h3 className="font-semibold mb-4">
              Assigned Users
            </h3>

            <Bar
              data={userChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>

        </div>

        {/* Services Table */}
        {/* <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-lg mb-4">
        Services List
      </h3>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <DNA
            visible={true}
            height="120"
            width="120"
          />
        </div>
      ) : (
        <Table
          columns={column}
          data={filteredData}
        />
      )}
    </div> */}

      </div>
    </section>
  )
}

export default SoftServiceWidgets