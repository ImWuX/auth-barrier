import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";

const App = () => {
    return (
    <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage isRegister />} />
    </Routes>
    );
}

export default App;
