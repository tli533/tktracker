import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const maxVisiblePages = 5; // Number of visible page numbers

  // Calculate the range of page numbers to display
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  return (
    <div className="pagination">
      {/* First Button */}
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
        First
      </button>

      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      {/* Page Numbers */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={currentPage === page ? "active" : ""}
        >
          {page}
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>

      {/* Last Button */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        Last
      </button>
    </div>
  );
};

export default Pagination;
