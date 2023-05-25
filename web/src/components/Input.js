import styles from "./Input.module.css";

const Input = ({ onChange, label, password, fillWidth, disabled }) => {
    return (<input className={styles.input} placeholder={label} type={password ? "password" : "text"} style={{ width: fillWidth ? "100%" : "auto" }} disabled={disabled} onChange={(e) => onChange(e.target.value)} />);
}

export default Input;