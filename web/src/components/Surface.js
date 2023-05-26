import styles from "./Surface.module.css";

const Surface = ({ children, stackVertical, width, center }) => {
    return (<div className={styles.surface} style={{ flexDirection: stackVertical ? "column" : "row", width: width ? width : "auto", alignItems: center ? "center" : "initial" }}>{children}</div>);
}

export default Surface;