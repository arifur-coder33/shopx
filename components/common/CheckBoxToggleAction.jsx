import CheckBox from "../input/CheckBox";

export default function CheckBoxToggleAction({
  action,
  id,
  currentValue,
  updatedValue,
  name,
  label,
}) {
  return (
    <CheckBox value={currentValue} label={label} name={name} colSpan="1" />
  );
}
