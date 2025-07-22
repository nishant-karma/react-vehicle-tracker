import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import MapView from "./components/MapView"; // where your Leaflet map lives
import VehicleTable from "./components/VehicleTable";

function App() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes below */}
        {isLoggedIn && (
          <>
            <Route path="/map" element={<MapView />} />
            <Route path="/vehicles" element={<VehicleTable />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
