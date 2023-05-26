import styles from "./Button.module.css";

const Button = ({ onClick, label, fillWidth }) => {
    return (<button className={styles.button} style={{ width: fillWidth ? "100%" : "auto" }} onClick={onClick}>{label}</button>);
}

export default Button;