import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AuthPage.module.css";
import Surface from "./components/Surface";
import Input from "./components/Input";
import Button from "./components/Button";

const AuthPage = ({ isRegister }) => {
    const [error, setError] = useState();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const auth = async () => {
        if(isRegister && password != confirmPassword) return setError({ confirmPassword: "Password and Confirm Password must match" });
        const res = await fetch(`/api/${isRegister ? "register" : "login"}`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });
        if(res.status != 200) return setError(await res.json().error);
        setError(undefined);
    }

    return (
        <div className={styles.container}>
            <Surface width="300px" stackVertical>
                <img className={styles.logo} src="https://host.thenest.dev/images/logo-small.png" />
                <h1>Auth Barrier</h1>
                {typeof error == "string" && <p className={styles.error}>{error}</p>}
                <Input label="Username" fillWidth onChange={setUsername} />
                {error && error.username && <p className={styles.error}>{error.username}</p>}
                <Input label="Password" fillWidth password onChange={setPassword} />
                {error && error.password && <p className={styles.error}>{error.password}</p>}
                {isRegister && <Input label="Confirm Password" fillWidth password onChange={setConfirmPassword} /> }
                {error && error.confirmPassword && <p className={styles.error}>{error.confirmPassword}</p>}
                <Button title={isRegister ? "Register" : "Login"} fillWidth onClick={auth} />
                {isRegister ?
                    <Link to="/login" className={styles.footer}>Already have an account? Login</Link>
                    : <Link to="/register" className={styles.footer}>Want to create an account? Register</Link>
                }
            </Surface>
        </div>
    );
}


export default AuthPage;