import { Link } from "react-router-dom";
import logo from "../assets/t8 logo clear.png";

const Navbar = () => {
  return (
    <header>
      <div className="container">
        <Link to="/">
          <img src={logo} alt="Logo" className="navLogo" />
          <h1> Tracker</h1>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
