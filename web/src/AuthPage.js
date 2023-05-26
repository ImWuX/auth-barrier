import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./AuthPage.module.css";
import Surface from "./components/Surface";
import Input from "./components/Input";
import Button from "./components/Button";

const AuthPage = ({ isRegister }) => {
    const [error, setError] = useState();
    const [requireTotp, setRequireTotp] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");

    const navigate = useNavigate();

    const auth = useCallback(async () => {
        if(isRegister && password !== confirmPassword) return setError({ confirmPassword: "Password and Confirm Password must match" });
        const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ username, password, code: requireTotp ? totpCode : undefined })
        });
        if(res.status !== 200) return setError((await res.json()).error);
        if(!isRegister && (await res.json()).totp) return setRequireTotp(true);
        setError(undefined);
        navigate("/portal");
    }, [setError, navigate, isRegister, username, password, confirmPassword, requireTotp, totpCode]);

    useEffect(() => {
        function handleKeyDown(event) {
            if(event.key !== "Enter") return;
            event.preventDefault();
            auth();
        }

        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [auth]);

    useEffect(() => setError(undefined), [username, password, confirmPassword]);

    return (
        <div className={styles.container}>
            <Surface width="300px" stackVertical center>
                <img className={styles.logo} src="https://host.thenest.dev/images/logo-small.png" alt="logo" />
                <h1>Auth Barrier</h1>
                {typeof error == "string" && <p className={styles.error}>{error}</p>}
                <Input label="Username" fillWidth disabled={requireTotp} onChange={setUsername} error={error && error.username} autoComplete="username" />
                <Input label="Password" fillWidth disabled={requireTotp} password onChange={setPassword} error={error && error.password} autoComplete="currentPassword" />
                {isRegister && <Input label="Confirm Password" fillWidth password onChange={setConfirmPassword} error={error && error.confirmPassword} /> }
                {requireTotp && <Input label="Two Factor Code" fillWidth onChange={setTotpCode} error={error && error.totp} /> }
                <Button label={isRegister ? "Register" : "Login"} fillWidth onClick={auth} />
                {isRegister ?
                    <Link to="/login" className={styles.footer}>Already have an account? Login</Link>
                    : <Link to="/register" className={styles.footer}>Want to create an account? Register</Link>
                }
            </Surface>
        </div>
    );
}

export default AuthPage;