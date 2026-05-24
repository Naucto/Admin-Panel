import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, Button, H2, H3, Input, Text } from "@adminjs/design-system";
import { ThemeBoot } from "./theme-tools.js";

type UserRow = {
  id: number;
  email: string;
  username: string;
  nickname?: string | null;
  accountStatus: string;
  roles: string[];
};

type AccessData = {
  forbidden?: boolean;
  query: string;
  notice?: {
    type: string;
    message: string;
  } | null;
  staff: UserRow[];
  candidates: UserRow[];
};

type PageApiClient = {
  client: {
    request: (options: {
      url: string;
      method: string;
      data: Record<string, unknown>;
    }) => Promise<{ data: unknown }>;
  };
};

function labelForUser(user: UserRow): string {
  return `${user.nickname || user.username} (${user.email})`;
}

const RolePills: React.FC<{ roles: string[]; status: string }> = ({ roles, status }) => (
  <Box display="flex" gridGap="default" flexWrap="wrap">
    {roles.map((role) => (
      <span key={role} className="naucto-pill">
        {role}
      </span>
    ))}
    <span className="naucto-pill">{status}</span>
  </Box>
);

const AccessManagement: React.FC = () => {
  const [data, setData] = useState<AccessData | null>(null);
  const [query, setQuery] = useState("");
  const api = useMemo(() => new ApiClient(), []);

  const load = (search = query): void => {
    api.getPage({ pageName: "accessManagement", params: { query: search } }).then((response) => {
      const payload = response.data as AccessData;
      setData(payload);
      setQuery(payload.query ?? search);
    });
  };

  useEffect(() => {
    load("");
  }, []);

  const submitSearch = (event: FormEvent): void => {
    event.preventDefault();
    load(query);
  };

  const updateModerator = (userId: number, action: "grantModerator" | "revokeModerator"): void => {
    (api as unknown as PageApiClient).client
      .request({
        url: "/api/pages/accessManagement",
        method: "POST",
        data: { action, userId, query }
      })
      .then((response: { data: unknown }) => {
        setData(response.data as AccessData);
      });
  };

  if (!data) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <Text>Loading access controls...</Text>
      </Box>
    );
  }

  if (data.forbidden) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <H2>Admin only</H2>
        <Text>Only Admin users can manage staff access.</Text>
      </Box>
    );
  }

  return (
    <Box p="xl" className="naucto-admin-page">
      <ThemeBoot />
      <H2>Access Management</H2>
      <Text className="naucto-muted">
        Add moderators by selecting an existing Naucto account. Admin accounts are kept visible here for audit.
      </Text>

      {data.notice ? (
        <Box className="naucto-soft-card" p="lg" mt="lg">
          <Text>{data.notice.message}</Text>
        </Box>
      ) : null}

      <Box
        display="grid"
        gridTemplateColumns="minmax(320px, 1fr) minmax(360px, 1fr)"
        gridGap="lg"
        mt="xl"
      >
        <Box className="naucto-card" p="lg">
          <H3>Add a Moderator</H3>
          <Box as="form" onSubmit={submitSearch} mt="lg" display="flex" gridGap="default">
            <Input
              name="query"
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              placeholder="Search by email, username, or nickname"
            />
            <Button type="submit" variant="contained">
              Search
            </Button>
          </Box>

          <Box mt="lg">
            {data.candidates.map((user) => {
              const isModerator = user.roles.includes("Moderator");
              const isAdmin = user.roles.includes("Admin");
              return (
                <Box key={user.id} className="naucto-soft-card" p="lg" mb="default">
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Text fontWeight="bold">{labelForUser(user)}</Text>
                      <RolePills roles={user.roles} status={user.accountStatus} />
                    </Box>
                    <Button
                      size="sm"
                      variant={isModerator ? "outlined" : "contained"}
                      disabled={isAdmin}
                      onClick={() =>
                        updateModerator(
                          user.id,
                          isModerator ? "revokeModerator" : "grantModerator"
                        )
                      }
                    >
                      {isModerator ? "Remove Moderator" : "Add Moderator"}
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box className="naucto-card" p="lg">
          <H3>Current Staff</H3>
          <Box mt="lg">
            {data.staff.map((user) => (
              <Box key={user.id} className="naucto-soft-card" p="lg" mb="default">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Text fontWeight="bold">{labelForUser(user)}</Text>
                    <RolePills roles={user.roles} status={user.accountStatus} />
                  </Box>
                  {user.roles.includes("Moderator") && !user.roles.includes("Admin") ? (
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={() => updateModerator(user.id, "revokeModerator")}
                    >
                      Remove Moderator
                    </Button>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AccessManagement;
