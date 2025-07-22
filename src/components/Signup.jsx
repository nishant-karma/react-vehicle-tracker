import { useState } from "react";
import { signup } from "../services/api";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER"); // default role

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await signup(email, password, role);
      localStorage.setItem("token", response.data.token);
      alert("Signup successful");
    } catch (err) {
      alert(err.response?.data || "Signup failed");
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      
      <select value={role} onChange={(e) => setRole(e.target.value)} required>
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>

      <button type="submit">Sign Up</button>
    </form>
  );
}

export default Signup;
