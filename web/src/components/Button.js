import styles from "./Button.module.css";

const Button = ({ onClick, title, fillWidth }) => {
    return (<button className={styles.button} style={{ width: fillWidth ? "100%" : "auto" }} onClick={onClick}>{title}</button>);
}

export default Button;