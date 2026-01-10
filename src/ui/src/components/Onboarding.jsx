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
} from "@mantine/core";
import { IconDatabase, IconShieldLock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export function Onboarding({ onConfigured }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      notifications.show({
        title: "Error",
        message: "Password is required",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/sqlite/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.success) {
        notifications.show({
          title: "Welcome!",
          message: "System configured successfully",
          color: "green",
        });
        onConfigured();
      } else {
        notifications.show({
          title: "Error",
          message: data.error,
          color: "red",
        });
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
            Welcome to SQLite
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Set up your administrator credentials to start managing your
            database.
          </Text>
        </Stack>

        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Administrator Username"
                placeholder="admin"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <PasswordInput
                label="Password"
                placeholder="Choose a strong password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Group mt="lg" justify="flex-end">
                <Button
                  type="submit"
                  color="dark"
                  fullWidth
                  loading={loading}
                  leftSection={<IconShieldLock size={18} />}
                >
                  Save and Start
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
        <Text c="dimmed" size="xs" ta="center" mt="xl">
          This configuration will be saved in sqlite-config.json
        </Text>
      </Container>
    </Box>
  );
}
