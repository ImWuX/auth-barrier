import styles from "./Input.module.css";

const Input = ({ onChange, label, password, fillWidth, disabled, error, autoComplete }) => {
    return (
        <div className={styles.container}>
            <input className={`${styles.input} ${error && styles.error}`} placeholder={label} type={password ? "password" : "text"} style={{ width: fillWidth ? "100%" : "auto" }} disabled={disabled} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
            {error && <p className={styles.errorlabel}>{error}</p>}
        </div>
    );
}

export default Input;