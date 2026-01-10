import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  Image,
  TextInput,
  ThemeIcon,
  Paper,
  Alert,
  Loader,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceMobile,
  IconCheck,
  IconX,
  IconCopy,
  IconShieldLock,
  IconAlertCircle,
} from "@tabler/icons-react";

export function SecuritySettings({ opened, onClose }) {
  const [status, setStatus] = useState(null); // { enabled: boolean }
  const [loading, setLoading] = useState(true);

  // Setup Flow State
  const [setupStep, setSetupStep] = useState(0); // 0: idle, 1: generating, 2: verifying
  const [qrData, setQrData] = useState(null); // { secret, qrCode }
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (opened) loadStatus();
  }, [opened]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/sqlite/auth/status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Failed to load status",
        color: "red",
      });
    }
    setLoading(false);
  };

  const startSetup = async () => {
    setSetupStep(1); // generating
    try {
      const res = await fetch("/sqlite/api/totp/generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setQrData(data);
        setSetupStep(2);
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to generate QR",
          color: "red",
        });
        setSetupStep(0);
      }
    } catch (e) {
      setSetupStep(0);
    }
  };

  const verifyAndEnable = async () => {
    if (!verifyCode) return;
    setVerifying(true);
    try {
      const res = await fetch("/sqlite/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: qrData.secret, code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        notifications.show({
          title: "Success",
          message: "2FA Enabled!",
          color: "green",
        });
        setSetupStep(0);
        loadStatus();
      } else {
        notifications.show({
          title: "Error",
          message: "Invalid code",
          color: "red",
        });
      }
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Request failed",
        color: "red",
      });
    }
    setVerifying(false);
  };

  const disable2FA = async () => {
    // In a real app we might ask for code confirmation here too,
    // but for simplicity we'll assume session auth is enough or ask for code in a prompt
    // For this UI, let's ask for code to confirm disable
    const code = prompt("Enter your 2FA code to confirm disabling:");
    if (!code) return;

    try {
      const res = await fetch("/sqlite/api/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        notifications.show({
          title: "Success",
          message: "2FA Disabled",
          color: "gray",
        });
        loadStatus();
      } else {
        notifications.show({
          title: "Error",
          message: data.error || "Failed to disable",
          color: "red",
        });
      }
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Request failed",
        color: "red",
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Security Settings"
      size="lg"
    >
      {loading ? (
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      ) : (
        <Stack>
          <Group justify="space-between" align="flex-start">
            <Group>
              <ThemeIcon
                size="xl"
                radius="md"
                color={status?.totpEnabled ? "green" : "gray"}
                variant="light"
              >
                <IconDeviceMobile size={28} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Two-Factor Authentication (2FA)</Text>
                <Text size="sm" c="dimmed">
                  {status?.totpEnabled
                    ? "Your account is secured with 2FA."
                    : "Add an extra layer of security to your account."}
                </Text>
              </div>
            </Group>
            {status?.totpEnabled ? (
              <Button color="red" variant="subtle" onClick={disable2FA}>
                Disable
              </Button>
            ) : (
              setupStep === 0 && (
                <Button color="dark" onClick={startSetup}>
                  Enable 2FA
                </Button>
              )
            )}
          </Group>

          {/* Setup Wizard */}
          {setupStep === 2 && qrData && (
            <Paper withBorder p="md" radius="md" bg="gray.0">
              <Stack align="center">
                <Text fw={600}>1. Scan QR Code</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Use your authenticator app (Google Authenticator, Authy, etc.)
                  to scan this code.
                </Text>

                <div
                  style={{
                    background: "white",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  <Image src={qrData.qrCode} w={180} h={180} />
                </div>

                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Secret: {qrData.secret}
                  </Text>
                  <CopyButton value={qrData.secret}>
                    {({ copied, copy }) => (
                      <ActionIcon
                        variant="subtle"
                        color={copied ? "green" : "gray"}
                        onClick={copy}
                        size="xs"
                      >
                        {copied ? (
                          <IconCheck size={12} />
                        ) : (
                          <IconCopy size={12} />
                        )}
                      </ActionIcon>
                    )}
                  </CopyButton>
                </Group>

                <Text fw={600} mt="md">
                  2. Verify Code
                </Text>
                <Group align="flex-start">
                  <TextInput
                    placeholder="000 000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    maxLength={6}
                    w={140}
                  />
                  <Button
                    onClick={verifyAndEnable}
                    loading={verifying}
                    color="dark"
                  >
                    Verify
                  </Button>
                </Group>

                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={() => setSetupStep(0)}
                >
                  Cancel
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Modal>
  );
}
