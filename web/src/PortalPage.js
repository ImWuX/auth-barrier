import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import QR from "react-qr-code";
import { SessionContext } from "./App";
import styles from "./PortalPage.module.css";
import Surface from "./components/Surface";
import Button from "./components/Button";
import Input from "./components/Input";
import Dialog from "./components/Dialog";

const PortalPage = () => {
    const session = useContext(SessionContext);
    const navigate = useNavigate();

    const [totpUrl, setTotpUrl] = useState();
    const [totpBackupCodes, setTotpBackupCodes] = useState();
    const [totpCode, setTotpCode] = useState();

    const [disableTotpDialog, setDisableTotpDialog] = useState(false);

    const changePassword = async () => {

    }

    const setupTotp = async () => {
        const res = await fetch("/api/totp/setup")
        if(res.status !== 200) return toast.error("Failed to setup two factor authentication");
        const data = await res.json();
        setTotpUrl(data.url);
        setTotpBackupCodes(data.backupCodes);
    }

    const enableTotp = async () => {
        if(!totpCode) return toast.error("Invalid code");
        const res = await fetch("/api/totp/enable", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: totpCode })
        });
        if(res.status !== 200) return toast.error((await res.json()).error);
        toast.success("Successfully setup two factor authentication");
        setTotpUrl(undefined);
        session.user.totp = true;
    }

    const disableTotp = async () => {
        if(!totpCode) return toast.error("Invalid code");
        const res = await fetch("/api/totp/disable", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: totpCode })
        });
        if(res.status !== 200) return toast.error((await res.json()).error);
        toast.success("Disabled two factor authentication");
        setDisableTotpDialog(false);
        session.user.totp = false;
    }

    const logout = async () => {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if(res.status === 200) return navigate("/login");
        toast.error("Failed to logout");
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <img src="logo.png" alt="logo" />
                <h1>{process.env.REACT_APP_APP_NAME}</h1>
            </div>
            <Surface width="100%" stackVertical>
                <h2 className={styles.username}>{session.user.username}</h2>
                <Button label="Change Password" onClick={changePassword} />
                {!session.user.totp ?
                    <Button label="Setup Two Factor Authentication" onClick={setupTotp} /> :
                    <Button label="Disable Two Factor Authentication" onClick={() => { setDisableTotpDialog(true); setTotpCode(undefined); }} />
                }
                <Button label="Logout" onClick={logout} />
            </Surface>
            {totpUrl ? (
                <Dialog
                    open={totpUrl !== undefined}
                    close={() => { setTotpUrl(undefined); setTotpBackupCodes(undefined); }}
                    title="Two Factor Setup"
                    description="Scan the QR code with Google Authenticator and enter the code below"
                    width="300px"
                    center
                >
                    <QR value={totpUrl} className={styles.qr} />
                    <Input label="Two Factor Code" onChange={setTotpCode} fillWidth />
                    <Button label="Setup" onClick={enableTotp} fillWidth/>
                </Dialog>
            ) : totpBackupCodes && (
                <Dialog
                    open={totpBackupCodes !== undefined}
                    close={() => setTotpBackupCodes(undefined)}
                    title="Backup Codes"
                    description="Save these backup codes in a secure place. If you lose your authenticator they are the only way of recovering your account"
                    width="fit-content"
                    center
                >
                    <ul>
                        {totpBackupCodes.map((code) => <li>{code}</li>)}
                    </ul>
                </Dialog>
            )}
            {disableTotpDialog && (
                <Dialog
                    open={disableTotpDialog}
                    close={() => setDisableTotpDialog(false)}
                    title="Disable Two Factor"
                    description="Enter the current code or a backup code"
                    width="300px"
                    center
                >
                <Input label="Two Factor Code" onChange={setTotpCode} fillWidth />
                <Button label="Disable" onClick={disableTotp} fillWidth/>
            </Dialog>
            )}
        </div>
    )
}

export default PortalPage;