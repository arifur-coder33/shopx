import ModalButton from "../modal/ModalButton";
import MediaSelector from "./MediaSelector";

export default function MediaModal({ multipleSelect }) {
  return (
    <ModalButton buttonName={"Select Media"}>
      <MediaSelector multipleSelect={true} />
    </ModalButton>
  );
}
