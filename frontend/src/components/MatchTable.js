import { useState } from "react";
import React from "react";
import Pagination from "./Pagination";

const MatchTable = ({ matches, wins }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate total pages
  const totalPages = Math.ceil(matches.length / itemsPerPage);

  // Get current page data
  const currentMatches = matches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="match-table">
      <h4>Match History</h4>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Character</th>
            <th>Result</th>
            <th>Opponent</th>
            <th>Character</th>
            <th>Opponent ID</th>
          </tr>
        </thead>
        <tbody>
          {currentMatches.map((match, index) => (
            <tr
              key={index}
              className={wins.includes(match) ? "win-row" : "loss-row"}
            >
              <td>{new Date(match.date).toLocaleDateString()}</td>
              <td>{match.char || "Unknown"}</td>
              <td>{wins.includes(match) ? "Win" : "Loss"}</td>
              <td>{match.opp || "Unknown"}</td>
              <td>{match.oppChar || "Unknown"}</td>
              <td>{match.oppId || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        {/* Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default MatchTable;
