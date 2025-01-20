import React from "react";
import { helix } from "ldrs";

helix.register();

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <a
          href="https://wank.wavu.wiki/api"
          target="_blank"
          rel="noopener noreferrer"
          className="database-link"
        >
          <l-helix size="40" speed="7" color="black"></l-helix>
          wavu
        </a>
        <p className="footer-text">
          Credits to wank.wavu.wiki for this fun project
        </p>
      </div>
    </footer>
  );
};

export default Footer;
