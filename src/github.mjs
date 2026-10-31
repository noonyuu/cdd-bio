const QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date weekday contributionCount } }
        }
      }
    }
  }
`;

/** 直近1年のコントリビューションカレンダーを古い順の配列で返す。 */
export async function fetchCalendar(login, token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "cdd-bio",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL が ${response.status} を返しました: ${await response.text()}`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL エラー: ${body.errors.map((error) => error.message).join(", ")}`);
  }
  const calendar = body.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error(`ユーザー ${login} のカレンダーが取得できませんでした`);

  const days = calendar.weeks.flatMap((week) => week.contributionDays).map((day) => ({ date: day.date, weekday: day.weekday, count: day.contributionCount }));
  return { days, totalContributions: calendar.totalContributions };
}
