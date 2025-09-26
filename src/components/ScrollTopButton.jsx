// ScrollTopButton.jsx
import React, { useCallback, useMemo } from 'react';
import {
  Fab,
  Zoom,
  Slide,
  Tooltip,
  CircularProgress,
  Box,
  useScrollTrigger,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

/**
 * <ScrollTopButton/>
 * ============================================================================
 * @param {Object}   props
 * @param {HTMLElement|null|undefined} props.target   Scroll container (undefined = window)
 * @param {number}   props.threshold   Show button after this scroll offset (px)
 * @param {number}   props.bottom      Distance from viewport bottom (px)
 * @param {number}   props.right       Distance from viewport right  (px)
 * @param {'small'|'medium'|'large'}   props.size      MUI Fab size
 */
const ScrollTopButton = ({
  target     = undefined,
  threshold  = 300,
  bottom     = '50%',
  right      = 24,
  size       = 'medium',
}) => {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold,
    target,
  });

  const pct = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const el  = target ?? window;
    const top = el === window ? window.scrollY : el.scrollTop || 0;
    const max = el === window
      ? document.documentElement.scrollHeight - window.innerHeight
      : el.scrollHeight - el.clientHeight;
    return Math.min(100, (top / (max || 1)) * 100);
  }, [target, trigger]);

  const handleClick = useCallback(() => {
    const el = target ?? window;
    if (el === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [target]);

  const RING_SIZE = { small: 40, medium: 56, large: 68 }[size];
  const ICON_SIZE = { small: 20, medium: 24, large: 28 }[size];

  return (
    <Slide in={trigger} direction="left" mountOnEnter unmountOnExit>
      <Zoom in={trigger}>
        <Tooltip title="Back to top" arrow>
          <Fab
            size={size}
            onClick={handleClick}
            aria-label="scroll back to top"
            sx={{
              position: 'fixed',
              right,
              bottom,
              transform: 'translateY(50%)',
              zIndex: 1200,
              backgroundColor: '#2e8b57', // SeaGreen
              color: '#ffffff',
              boxShadow: '0 2px 10px #2e8b5788, 0 0 0 2px #00ffaa55',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(50%) scale(1.1)',
                boxShadow: '0 4px 16px #00ffaa, 0 0 0 2px rgba(104, 164, 255, 0.53)',
              },
              '&:active': {
                transform: 'translateY(50%) scale(0.95)',
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width:  RING_SIZE,
                height: RING_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress
                variant="determinate"
                value={pct}
                size={RING_SIZE}
                thickness={4}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  color: '#ffffff',
                  opacity: 0.2,
                }}
              />
              <KeyboardArrowUpIcon sx={{ fontSize: ICON_SIZE, color: '#ffffff' }} />
            </Box>
          </Fab>
        </Tooltip>
      </Zoom>
    </Slide>
  );
};

export default ScrollTopButton;
