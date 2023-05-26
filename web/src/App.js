import { createContext, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import PortalPage from "./PortalPage";

const SessionContext = createContext();

const Protected = ({ children }) => {
    const [session, setSession] = useState();
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/session")
            .then(async (res) => {
                if(res.status === 200) {
                    setAuthenticated(true);
                    setSession(await res.json());
                }
                setLoading(false);
            });
    }, []);

    if(loading) return null;
    if(authenticated)
        return (<SessionContext.Provider value={session}>{children}</SessionContext.Provider>);
    else
        return <Navigate to="/login" />;
}

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/portal" />} />
            <Route path="/portal" element={<Protected><PortalPage /></Protected>} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage isRegister />} />
        </Routes>
    );
}

export default App;
export {
    SessionContext
}