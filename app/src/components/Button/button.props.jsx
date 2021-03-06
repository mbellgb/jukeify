import PropTypes from "prop-types";

export const propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

export const defaultProps = {
  children: "",
  className: "",
  disabled: false,
  onClick: () => {},
};
