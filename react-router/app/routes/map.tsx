import MapPoint from "../components/molecules/MapPoint";
import styles from "./map.module.css";

export default function MapPage() {
	return (
		<main className={styles.page}>
			<h1>地図で範囲を指定</h1>
			<MapPoint />
		</main>
	);
}