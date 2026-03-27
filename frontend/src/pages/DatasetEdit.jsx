import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DatasetEdit() {

  const { id } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef();

  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [quickFilter, setQuickFilter] = useState("");

  const token = localStorage.getItem("token");

  // ============================
  // LOAD DATA
  // ============================
  const loadData = async () => {

    try {

      const res = await axios.get(
        `http://localhost:8000/api/datasets/${id}/preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res?.data || {};

      const cols = Array.isArray(data.columns) ? data.columns : [];
      let rows = [];

      if (Array.isArray(data.rows)) {

        if (typeof data.rows[0] === "object") {
          rows = data.rows;
        } else {

          rows = data.rows.map(r => {
            const obj = {};
            cols.forEach((col, i) => {
              obj[col] = r[i];
            });
            return obj;
          });

        }

      }

      const colDefs = cols.map(col => ({
        headerName: col,
        field: col,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true
      }));

      setColumnDefs(colDefs);
      setRowData(rows);

    } catch (err) {
      console.error("Dataset load error:", err);
    }

  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================
  // SAVE ALL CHANGES
  // ============================
  const saveAll = async () => {

    try {

      const rows = [];

      gridRef.current.api.forEachNode(node => {
        rows.push(node.data);
      });

      for (let i = 0; i < rows.length; i++) {

        await axios.put(
          `http://localhost:8000/api/datasets/${id}/row/${i}`,
          rows[i],
          { headers: { Authorization: `Bearer ${token}` } }
        );

      }

      alert("All changes saved successfully");

    } catch (err) {

      console.error(err);
      alert("Save failed");

    }

  };

  // ============================
  // ADD ROW
  // ============================
  const addRow = async () => {

    await axios.post(
      `http://localhost:8000/api/datasets/${id}/row`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadData();

  };

  // ============================
  // DELETE ROW
  // ============================
  const deleteRow = async () => {

    const focused = gridRef.current.api.getFocusedCell();

    if (!focused) {
      alert("Select a row first");
      return;
    }

    const rowIndex = focused.rowIndex;

    await axios.delete(
      `http://localhost:8000/api/datasets/${id}/row/${rowIndex}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadData();

  };

  // ============================
  // RENAME COLUMN
  // ============================
  const renameColumn = async () => {

    const oldName = prompt("Column to rename");
    const newName = prompt("New column name");

    if (!oldName || !newName) return;

    await axios.put(
      `http://localhost:8000/api/datasets/${id}/column/rename`,
      { old: oldName, new: newName },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadData();

  };

  // ============================
  // GRID READY
  // ============================
  const onGridReady = (params) => {
    params.api.sizeColumnsToFit();
  };

  return (

    <div style={{ padding: 20 }}>

      <h2>Dataset Editor</h2>

      {/* Toolbar */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "15px",
        flexWrap: "wrap"
      }}>

        <button onClick={addRow}>Add Row</button>

        <button onClick={deleteRow}>
          Delete Row
        </button>

        <button onClick={renameColumn}>
          Rename Column
        </button>

        <button onClick={saveAll}>
          Save All
        </button>

        <button onClick={() => navigate(-1)}>
          Back
        </button>

        <input
          placeholder="Search rows..."
          value={quickFilter}
          onChange={(e) => {
            setQuickFilter(e.target.value);
            gridRef.current.api.setQuickFilter(e.target.value);
          }}
          style={{
            marginLeft: "20px",
            padding: "5px"
          }}
        />

      </div>

      {/* GRID */}

      <div
        className="ag-theme-alpine"
        style={{
          width: "100%",
          height: "70vh",
          border: "1px solid #ddd",
          borderRadius: "6px"
        }}
      >

        <AgGridReact

          ref={gridRef}

          rowData={rowData}
          columnDefs={columnDefs}

          rowSelection={{ mode: "singleRow" }}

          pagination={true}
          paginationPageSize={50}

          animateRows={true}

          defaultColDef={{
            editable: true,
            resizable: true,
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 120
          }}

          rowHeight={36}

          onGridReady={onGridReady}

        />

      </div>

    </div>

  );

}
