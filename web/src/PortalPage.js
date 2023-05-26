import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "./App";
import styles from "./PortalPage.module.css";
import Surface from "./components/Surface";
import Button from "./components/Button";

const PortalPage = () => {
    const session = useContext(SessionContext);
    const navigate = useNavigate();

    const logout = async () => {
        const res = await fetch("/api/logout", { method: "POST" });
        if(res.status == 200) navigate("/login");
    }

    return (
        <div className={styles.container}>
            <h1>Auth Barrier Portal Page</h1>
            <Surface width="100%" stackVertical>
                <h2 className={styles.username}>{session.user.username}</h2>
                <Button label="Change Password" />
                <Button label="Logout" onClick={logout} />
            </Surface>
        </div>
    )
}

export default PortalPage;