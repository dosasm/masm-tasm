import React from "react";
import { Button, ButtonGroup, ClickAwayListener, Grid, Grow, MenuItem, MenuList, Paper, Popper } from "@material-ui/core";
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';

interface ActionButtonsProps {
    options: {
        name: string;
        label: string;
        "zh-CN": string;
        action: () => void;
    }[]
}

export function ActionButtons(props: ActionButtonsProps) {

    const labelName = navigator.language === "zh-CN" ? "zh-CN" : "label"

    if (window.screen.width < 600) {
        return SplitButtons({
            options: props.options.map(val => val[labelName]),
            onClick: (idx) => {
                props.options[idx].action()
            }
        });
    }

    const { options } = props;

    let content = [];

    for (const option of options) {
        content.push(
            <Button
                key={"Options-" + option.name}
                onClick={(e) => option.action()}
            >
                {option[labelName]}
            </Button>
        )
    }
    return (
        <ButtonGroup className="control-buttons"
            color="default"
            variant="text"
            aria-label={"outlined primary button group"}
        >
            {content}
        </ButtonGroup>
    )
}


export function SplitButtons(props: { options: string[], onClick: (idx: number) => void }) {

    const { options, onClick } = props;

    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = React.useState(2);

    const handleClick = () => {
        onClick(selectedIndex);
        console.info(`You clicked ${options[selectedIndex]}`);
    };

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLLIElement, MouseEvent>,
        index: number,
    ) => {
        setSelectedIndex(index);
        setOpen(false);
    };

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event: React.MouseEvent<Document, MouseEvent>) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return;
        }

        setOpen(false);
    };

    return (
        <Grid container direction="column" alignItems="center">
            <Grid item xs={12}>
                <ButtonGroup className="control-buttons" variant="outlined" color="primary" ref={anchorRef} aria-label="split button">
                    <Button onClick={handleClick}>{options[selectedIndex]}</Button>
                    <Button
                        color="primary"
                        size="small"
                        aria-controls={open ? 'split-button-menu' : undefined}
                        aria-expanded={open ? 'true' : undefined}
                        aria-label="select merge strategy"
                        aria-haspopup="menu"
                        onClick={handleToggle}
                    >
                        <ArrowDropDownIcon />
                    </Button>
                </ButtonGroup>
                <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal style={{ zIndex: 99 }}>
                    {({ TransitionProps, placement }) => (
                        <Grow
                            {...TransitionProps}
                            style={{
                                transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                            }}
                        >
                            <Paper>
                                <ClickAwayListener onClickAway={handleClose}>
                                    <MenuList id="split-button-menu">
                                        {options.map((option, index) => (
                                            <MenuItem
                                                // key={option}
                                                //disabled={index === 2}
                                                selected={index === selectedIndex}
                                                onClick={(event) => handleMenuItemClick(event, index)}
                                            >
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </Grid>
        </Grid>
    );
}