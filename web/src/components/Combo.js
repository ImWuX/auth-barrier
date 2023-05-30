import { useState } from "react";
import { Combobox } from "@headlessui/react";
import styles from "./Combo.module.css";

const Combo = ({ list, display, selected, setSelected, fillWidth }) => {
    const [query, setQuery] = useState("");
    const filteredList = list.filter((item) => (display ? display(item) : item).toLowerCase().startsWith(query.toLowerCase()));

    return (
        <Combobox value={selected} onChange={setSelected}>
            <Combobox.Input style={{ width: fillWidth ? "100%" : undefined }} className={styles.combo} onChange={(event) => setQuery(event.target.value)} displayValue={(item) => display ? display(item) : item} />
            <Combobox.Options className={styles.combodrop}>
            {filteredList.length !== 0 ? filteredList.map((item) => (
                <Combobox.Option className={styles.combodropitem} key={display ? display(item) : item} value={item}>{display ? display(item) : item}</Combobox.Option>
            )) : <div className={styles.nodropitem}>No user found</div>}
            </Combobox.Options>
        </Combobox>
    );
}

export default Combo;