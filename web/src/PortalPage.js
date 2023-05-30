import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import QR from "react-qr-code";
import { SessionContext } from "./App";
import styles from "./PortalPage.module.css";
import Surface from "./components/Surface";
import Button from "./components/Button";
import IconButton from "./components/IconButton";
import Input from "./components/Input";
import Dialog from "./components/Dialog";
import Combo from "./components/Combo";
import trashIcon from "./icons/trash.svg";
import editIcon from "./icons/edit.svg";

const PortalPage = () => {
    const session = useContext(SessionContext);
    const navigate = useNavigate();

    const [passwordResetDialog, setPasswordResetDialog] = useState(false);
    const [newPassword, setNewPassword] = useState();
    const [newPasswordConfirm, setNewPasswordConfirm] = useState();
    const [passwordResetError, setPasswordResetError] = useState();
    const [passwordResetCode, setPasswordResetCode] = useState();

    const [totpUrl, setTotpUrl] = useState();
    const [totpBackupCodes, setTotpBackupCodes] = useState();
    const [totpCode, setTotpCode] = useState();

    const [disableTotpDialog, setDisableTotpDialog] = useState(false);

    const [siteName, setSiteName] = useState();
    const [newSiteDialog, setNewSiteDialog] = useState(false);
    const [sites, setSites] = useState([]);

    const [editSiteUser, setEditSiteUser] = useState();
    const [editSite, setEditSite] = useState();

    const [users, setUsers] = useState([]);

    const changePassword = async () => {
        setPasswordResetError(undefined);
        if(!newPassword || newPassword.length <= 0) return setPasswordResetError({ password: ["Missing new password"] });
        if(newPassword !== newPasswordConfirm) return setPasswordResetError({ confirmPassword: ["Password and confirm password must match"] });
        if(session.user.totp && (!passwordResetCode || passwordResetCode.length <= 0)) return setPasswordResetError({ totp: ["Missing two factor code"] });
        const res = await fetch("/api/auth/passwordreset", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ password: newPassword, code: passwordResetCode })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            if(typeof error == "string") return toast.error(error);
            return setPasswordResetError(error);
        }
        toast.success("Successfully changed your password");
        setPasswordResetDialog(false);
        setNewPassword(undefined);
        setNewPasswordConfirm(undefined);
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
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.code[0]);
        }
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
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.code[0]);
        }
        toast.success("Disabled two factor authentication");
        setDisableTotpDialog(false);
        session.user.totp = false;
    }

    const logout = async () => {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if(res.status === 200) return navigate("/login");
        toast.error("Failed to logout");
    }

    const newSite = async () => {
        if(!siteName || siteName.length <= 0) return toast.error("Invalid name");
        const res = await fetch("/api/sites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: siteName })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.name[0]);
        }
        toast.success(`Created ${siteName}`);
        setNewSiteDialog(false);
        refreshSites();
    }

    const deleteSite = async (name) => {
        const res = await fetch("/api/sites", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.name[0]);
        }
        toast.success(`Deleted ${name}`);
        refreshSites();
    }

    const deleteUser = async (user) => {
        const res = await fetch("/api/users", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: user.id })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.id[0]);
        }
        toast.success(`Deleted ${user.username}`);
        refreshUsers();
    }

    const addSiteUser = async () => {
        if(!editSiteUser) return toast.error("Invalid user");
        const res = await fetch("/api/sites/user", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ siteName: editSite.name, userId: editSiteUser.id })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.id[0]);
        }
        toast.success(`Added ${editSiteUser.username} to ${editSite.name}`);
        refreshSites();
        setEditSite(undefined);
        setEditSiteUser("");
    }

    const deleteSiteUser = async (user) => {
        const res = await fetch("/api/sites/user", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ siteName: editSite.name, userId: user.id })
        });
        if(res.status !== 200) {
            const error = (await res.json()).error;
            return toast.error(typeof error == "string" ? error : error.id[0]);
        }
        toast.success(`Deleted ${user.username} from ${editSite.name}`);
        refreshSites();
        setEditSite(undefined);
        setEditSiteUser("");
    }

    const refreshSites = new useCallback(async () => {
        const res = await fetch("/api/sites");
        setSites(await res.json());
    }, []);

    const refreshUsers = new useCallback(async () => {
        const res = await fetch("/api/users");
        setUsers(await res.json());
    }, []);

    useEffect(() => {
        if(!session.user.isAdmin) return;
        refreshSites();
        refreshUsers();
    }, [refreshSites, refreshUsers]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <img src="logo.png" alt="logo" />
                <h1>{process.env.REACT_APP_APP_NAME}</h1>
            </div>
            <Surface width="100%" stackVertical>
                <h2 className={styles.username}>{session.user.username}</h2>
                <Button label="Change Password" onClick={() => setPasswordResetDialog(true)} />
                {!session.user.totp ?
                    <Button label="Setup Two Factor Authentication" onClick={setupTotp} /> :
                    <Button label="Disable Two Factor Authentication" onClick={() => { setDisableTotpDialog(true); setTotpCode(undefined); }} />
                }
                <Button label="Logout" onClick={logout} />
            </Surface>
            <Dialog
                open={passwordResetDialog}
                close={() => setPasswordResetDialog(false)}
                title="Reset Password"
                description="Provide a new password"
                width="300px"
                center
            >
                <Input label="Password" onChange={setNewPassword} error={passwordResetError && passwordResetError.password} password fillWidth />
                <Input label="Confirm Password" onChange={setNewPasswordConfirm} error={passwordResetError && passwordResetError.confirmPassword} password fillWidth />
                {session.user.totp && <Input label="Two Factor Code" onChange={setPasswordResetCode} error={passwordResetError && passwordResetError.totp} fillWidth />}
                <Button label="Change Password" onClick={changePassword} fillWidth />
            </Dialog>
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
            {session.user.isAdmin && (
                <>
                    <Dialog
                        open={newSiteDialog}
                        close={() => setNewSiteDialog(false)}
                        title="New Site"
                        width="300px"
                        center
                    >
                        <Input label="Name" onChange={setSiteName} fillWidth />
                        <Button label="Create" onClick={newSite} fillWidth />
                    </Dialog>
                    <Dialog
                        open={editSite !== undefined}
                        close={() => setEditSite(undefined)}
                        title={`Edit ${editSite?.name}`}
                        description="Add/Remove users that have access to this site"
                        center
                    >
                        {editSite?.users.map((user) => (
                            <>
                                <div className={styles.divider} />
                                <div className={styles.user}>
                                    <div>
                                        {user.username}
                                    </div>
                                    <IconButton icon={trashIcon} onClick={() => deleteSiteUser(user)} />
                                </div>
                            </>
                        ))}
                        <Combo list={users} display={(user) => user.username} selected={editSiteUser} setSelected={setEditSiteUser} fillWidth/>
                        <Button label="Add" onClick={addSiteUser} fillWidth />
                    </Dialog>
                    <Surface width="100%" stackVertical>
                        <h2>Sites</h2>
                        {sites.map((site) => (
                            <>
                                <div className={styles.divider} />
                                <div className={styles.site}>
                                    <div className={styles.siteusers}>
                                        {site.name}
                                        <p>{site.users.map((user) => user.username + ", ")}</p>
                                    </div>
                                    <div className={styles.siteactions}>
                                        <IconButton icon={editIcon} onClick={() => setEditSite(site)} />
                                        <IconButton icon={trashIcon} onClick={() => deleteSite(site.name)} />
                                    </div>
                                </div>
                            </>
                        ))}
                        <Button label="New" onClick={() => setNewSiteDialog(true)} />
                    </Surface>
                    <Surface width="100%" stackVertical>
                        <h2>Users</h2>
                        {users.map((user) => (
                            <>
                                <div className={styles.divider} />
                                <div className={styles.user}>
                                    <div>
                                        {user.username}
                                    </div>
                                    <IconButton icon={trashIcon} onClick={() => deleteUser(user)} />
                                </div>
                            </>
                        ))}
                    </Surface>
                </>
            )}
        </div>
    )
}

export default PortalPage;