import { useState, useRef, useCallback, useEffect } from "react";
import {
  ActionIcon,
  RingProgress,
  Tooltip,
  Box,
  Button,
  Loader,
} from "@mantine/core";
import { IconTrash, IconCopy, IconCheck } from "@tabler/icons-react";

/**
 * HoldButton - Botão que requer segurar por um tempo para confirmar ação
 * Ideal para ações destrutivas como delete
 */
export function HoldButton({
  onConfirm,
  holdDuration = 3000,
  icon: Icon = IconTrash,
  color = "red",
  size = "md",
  tooltip = "Segure para confirmar",
  confirmingTooltip = "Segurando...",
  ...props
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const startHold = useCallback(() => {
    if (props.disabled || props.loading) return;

    setIsHolding(true);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(intervalRef.current);
        setIsHolding(false);
        setProgress(0);
        onConfirm?.();
      }
    }, 50);
  }, [holdDuration, onConfirm, props.disabled, props.loading]);

  const cancelHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Tooltip label={isHolding ? confirmingTooltip : tooltip} withArrow>
      <Box
        style={{
          position: "relative",
          display: "inline-flex",
          verticalAlign: "middle",
        }}
      >
        {isHolding && (
          <RingProgress
            size={size === "sm" ? 28 : size === "md" ? 34 : 42}
            thickness={2}
            sections={[{ value: progress, color }]}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
        )}
        <ActionIcon
          variant="subtle"
          color={color}
          size={size}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          style={{
            opacity: isHolding ? 0.7 : 1,
            transition: "opacity 0.2s",
            ...props.style,
          }}
          {...props}
        >
          {props.loading ? (
            <Loader size={12} color={color} />
          ) : (
            <Icon size={size === "sm" ? 14 : size === "md" ? 18 : 22} />
          )}
        </ActionIcon>
      </Box>
    </Tooltip>
  );
}

/**
 * TextHoldButton - Versão em texto do botão de segurar
 * Usado para compatibilidade com type="button" ou quando children é passado
 */
export function TextHoldButton({
  onDelete,
  timerSeconds = 3,
  children,
  loading,
  disabled,
  variant = "light",
  color = "red",
  leftSection = <IconTrash size={14} />,
  ...buttonProps
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(timerSeconds);
  const deleteTimerRef = useRef(null);
  const deleteIntervalRef = useRef(null);

  const startDeleteTimer = () => {
    if (loading || disabled) return;
    setIsDeleting(true);
    setDeleteCountdown(timerSeconds);

    deleteTimerRef.current = setTimeout(() => {
      handleDelete();
    }, timerSeconds * 1000);

    deleteIntervalRef.current = setInterval(() => {
      setDeleteCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          clearInterval(deleteIntervalRef.current);
          return 0;
        }
        return newCount;
      });
    }, 1000);
  };

  const stopDeleteTimer = () => {
    setIsDeleting(false);
    setDeleteCountdown(timerSeconds);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
  };

  const handleDelete = async () => {
    stopDeleteTimer();
    if (onDelete) await onDelete();
  };

  useEffect(() => {
    return () => stopDeleteTimer();
  }, []);

  return (
    <Tooltip
      label="Mantenha pressionado até a contagem terminar para confirmar a exclusão"
      withArrow
      multiline
      w={220}
    >
      <Button
        variant={variant}
        color={isDeleting ? "orange" : color}
        leftSection={leftSection}
        onMouseDown={startDeleteTimer}
        onMouseUp={stopDeleteTimer}
        onMouseLeave={stopDeleteTimer}
        onTouchStart={startDeleteTimer}
        onTouchEnd={stopDeleteTimer}
        disabled={loading || disabled}
        style={{
          transition: "all 0.2s ease",
          transform: isDeleting ? "scale(0.98)" : "scale(1)",
          ...buttonProps.style,
        }}
        {...buttonProps}
      >
        {isDeleting
          ? `Excluindo em ${deleteCountdown}s...`
          : children || "Segure para Excluir"}
      </Button>
    </Tooltip>
  );
}

/**
 * Wrapper para manter compatibilidade com Components.Buttons.Delete
 */
export function ButtonDelete({
  onDelete,
  timerSeconds = 3,
  type = "button",
  ...props
}) {
  if (type === "icon") {
    return (
      <HoldButton
        onConfirm={onDelete}
        holdDuration={timerSeconds * 1000}
        {...props}
      />
    );
  }
  return (
    <TextHoldButton
      onDelete={onDelete}
      timerSeconds={timerSeconds}
      {...props}
    />
  );
}
