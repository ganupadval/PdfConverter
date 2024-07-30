import React from "react";

const InvoiceTable = ({ data }) => {
  const renderTableCell = (value) => {
    if (typeof value === "object" && value !== null) {
      // Check for arrays or objects
      if (Array.isArray(value)) {
        // Render array elements as separate rows (optional)
        return value.map((item, index) => (
          <tr key={index}>
            <td className="border border-gray-300 px-4 py-2"></td>
            <td className="border border-gray-300 px-4 py-2">{renderTableCell(item)}</td>
          </tr>
        ));
      } else {
        // Recursively render nested objects
        return (
          <table className="nested-table">
            <tbody>
              {Object.entries(value).map(([key, value]) => (
                <tr key={key}>
                  <th className="border border-gray-300 px-4 py-2">{key}</th>
                  <td className="border border-gray-300 px-4 py-2">{renderTableCell(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
    }
    return value;
  };

  return (
    <table className="border-collapse w-full">
      <tbody>
        {Object.entries(data).map(([key, value]) => (
          <tr key={key}>
            <td className="border border-gray-300 px-4 py-2 font-semibold">{key}</td>
            <td className="border border-gray-300 px-4 py-2">{renderTableCell(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InvoiceTable;
