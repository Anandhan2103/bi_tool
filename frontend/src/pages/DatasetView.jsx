import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function DatasetView() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDataset();
    }
  }, [id]);

  const loadDataset = async () => {

    try {

      setLoading(true);

      // Fetch metadata
      const metaRes = await api.get(`/datasets/${id}/metadata`);

      // Fetch preview rows
      const previewRes = await api.get(`/datasets/${id}/preview`);

      // Extract columns
      const cols = metaRes?.data ? Object.keys(metaRes.data) : [];
      setColumns(cols);

      // Extract rows safely
      const fetchedRows = Array.isArray(previewRes?.data?.rows)
        ? previewRes.data.rows
        : [];

      setRows(fetchedRows);

      // Dataset info
      setDataset(previewRes?.data?.dataset || { name: "Dataset" });

    } catch (err) {

      console.error("Dataset load error:", err);

      if (err.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      alert("Failed to load dataset");

    } finally {

      setLoading(false);

    }

  };

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        Loading dataset...
      </div>
    );
  }

  return (

    <div style={{ padding: 40 }}>

      <h2>{dataset?.name || "Dataset"}</h2>

      <div style={{ marginBottom: 20 }}>

        <button
          onClick={() => navigate(`/dataset/${id}/edit`)}
        >
          Edit Dataset
        </button>

        <button
          style={{ marginLeft: 10 }}
          onClick={() => navigate(-1)}
        >
          Back
        </button>

      </div>

      <div style={{ overflowX: "auto" }}>

        <table border="1" cellPadding="8">

          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  style={{ textAlign: "center" }}
                >
                  No data available
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col}>{row?.[col]}</td>
                  ))}
                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}