import { createContext, useContext, useState } from "react";

const DatasetContext = createContext(null);

export const DatasetProvider = ({ children }) => {
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasetSchema, setDatasetSchema] = useState(null);
  const [datasetPreview, setDatasetPreview] = useState(null);

  const value = {
    activeDataset,
    setActiveDataset,
    datasetSchema,
    setDatasetSchema,
    datasetPreview,
    setDatasetPreview
  };

  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used inside DatasetProvider");
  }
  return context;
};