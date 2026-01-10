import { useState } from "react";
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Container,
  Group,
  Stack,
  ThemeIcon,
  Box,
  Transition,
} from "@mantine/core";
import { IconDatabase, IconLock, IconDeviceMobile } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/sqlite/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totpCode }),
      });
      const data = await response.json();

      if (data.success) {
        onLogin();
      } else {
        if (data.code === "2FA_REQUIRED") {
            setShowTotp(true);
            notifications.show({
                title: "Authentication Required",
                message: "Please enter your 2FA code",
                color: "blue",
                icon: <IconDeviceMobile size={16} />
            });
        } else {
            notifications.show({
            title: "Login Failed",
            message: data.error || "Invalid credentials",
            color: "red",
            });
        }
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to connect to server",
        color: "red",
      });
    }
    setLoading(false);
  };

  return (
    <Box
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FBFAF8",
      }}
    >
      <Container size={420}>
        <Stack align="center" mb="xl">
          <ThemeIcon size={60} radius="md" color="dark">
            <IconDatabase size={34} />
          </ThemeIcon>
          <Title order={1} fw={700}>
            SQLite Admin Login
          </Title>
        </Stack>

        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Username"
                placeholder="Your username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={showTotp}
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={showTotp}
              />
              
              {showTotp && (
                  <TextInput
                    label="Authenticator Code (2FA)"
                    placeholder="000 000"
                    required
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    leftSection={<IconDeviceMobile size={16} />}
                    maxLength={6}
                  />
              )}

              <Group mt="lg">
                <Button 
                    type="submit" 
                    color="dark" 
                    fullWidth 
                    loading={loading}
                    leftSection={<IconLock size={18} />}
                >
                  {showTotp ? "Verify & Login" : "Login"}
                </Button>
              </Group>
              
              {showTotp && (
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    ta="center" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setShowTotp(false); setTotpCode(""); }}
                  >
                      Cancel
                  </Text>
              )}
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
